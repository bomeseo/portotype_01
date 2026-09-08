<?php
declare(strict_types=1);

function now_ms(): int { return (int) floor(microtime(true) * 1000); }
function rid(): string { return bin2hex(random_bytes(16)); }
function check(bool $ok, string $message): void { if (!$ok) throw new DomainException($message); }
function field(array $v, string $key, int $max = 2000, int $min = 1): string {
    $s = trim((string)($v[$key] ?? ''));
    $n = preg_match_all('/./us', $s);
    check($n !== false && $n >= $min && $n <= $max, "$key 입력을 확인해 주세요.");
    return $s;
}
function guest(): array {
    return ['id'=>'me','name'=>'방문자','bio'=>'','location'=>'','method'=>'둘 다','phone'=>'','verified'=>false,
        'interests'=>[],'publicHistory'=>false,'showOnline'=>true,'dnd'=>['enabled'=>false,'start'=>'23:00','end'=>'08:00'], 'status'=>'guest','role'=>'member'];
}
function new_member(string $id, string $name): array {
    return array_merge(guest(), ['id'=>$id,'name'=>$name,'status'=>'active','lastSeen'=>now_ms(),'createdAt'=>now_ms()]);
}
function blocked(array $db, string $a, string $b): bool {
    return isset($db['blocks'][$a.':'.$b]) || isset($db['blocks'][$b.':'.$a]);
}
function restrict_member(array &$db, string $uid): void {
    $db['users'][$uid]['status']='banned';
    foreach($db['auctions']??[] as $id=>$a)if($a['status']==='active'&&($a['sellerId']===$uid||($a['winnerId']??null)===$uid)) {
        $db['auctions'][$id]['status']='hidden';
        notice($db,$a['sellerId'],'경매 진행 중지',$a['title'].' · 관련 회원 이용 제한으로 운영진 확인이 필요합니다.');
        if(isset($a['winnerId']))notice($db,$a['winnerId'],'경매 진행 중지',$a['title']);
    }
    foreach($db['trades']??[] as $id=>$t)if($t['status']!=='거래 완료'&&in_array($uid,[$t['buyerId'],$t['sellerId']],true))$db['trades'][$id]['status']='거래 중지';
}
function settle(array &$db): void {
    foreach ($db['auctions'] ?? [] as $id => $a) {
        if ($a['status'] !== 'active' || $a['endTime'] > now_ms()) continue;
        $db['auctions'][$id]['status'] = $a['bidsCount'] ? 'ended' : 'unsold';
        if (!$a['bidsCount']) continue;
        $buyer = $a['winnerId'];
        $db['trades'][$id] = ['id'=>(string)$id,'auctionId'=>$a['id'],'sellerId'=>$a['sellerId'],'buyerId'=>$buyer,
            'title'=>$a['title'],'amount'=>$a['currentPrice'],'status'=>'협의 중','at'=>now_ms()];
        foreach ([$buyer, $a['sellerId']] as $uid) notice($db, $uid, '경매가 마감됐어요', $a['title']);
    }
}
function notice(array &$db, string $uid, string $title, string $text): void {
    $id = rid(); $db['notifications'][$id] = compact('id','uid','title','text') + ['at'=>now_ms(),'read'=>false];
}
function public_member(array $db, array $u): array {
    $keys = ['id','name','bio','location','method','verified','publicHistory','showOnline','dnd','status'];
    $p = array_intersect_key($u, array_flip($keys));
    $p['lastSeen'] = $u['showOnline'] ? ($u['lastSeen'] ?? null) : null;
    $ratings = array_column(array_filter($db['reviews'] ?? [], fn($r)=>$r['sellerId']===$u['id']), 'rating');
    $p['rating'] = $ratings ? round(array_sum($ratings)/count($ratings),1) : null;
    $p['fraud'] = ($u['fraudConfirmed']??false) ? 'confirmed' : ($u['status']==='banned' ? 'restricted' : 'unknown');
    return $p;
}
function snapshot(array $db, ?string $uid): array {
    $map = fn($id) => $uid && $id === $uid ? 'me' : $id;
    $u = $uid ? $db['users'][$uid] : guest();
    unset($u['passwordHash']); $u['id'] = 'me';
    $out = ['user'=>$u,'authenticated'=>(bool)$uid,'sellers'=>new stdClass(),'auctions'=>[],'likes'=>[],'blocked'=>[],
        'bids'=>[],'chats'=>[],'trades'=>[],'publicTrades'=>[],'reviews'=>[],'reports'=>[],'tickets'=>[],'notifications'=>[]];
    foreach ($db['users'] ?? [] as $id=>$member) {
        if ($id === $uid) continue;
        $p = public_member($db,$member);
        // Quiet hours are only shared with actual conversation partners.
        $peer = false;
        foreach ($db['rooms'] ?? [] as $room) if ($uid && in_array($uid,$room['members'],true) && in_array($id,$room['members'],true)) $peer=true;
        if (!$peer) $p['dnd'] = ['enabled'=>false,'start'=>'23:00','end'=>'08:00'];
        $out['sellers']->{$id} = $p;
    }
    foreach ($db['auctions'] ?? [] as $a) {
        $participant = $uid && ($a['sellerId']===$uid || ($a['winnerId']??null)===$uid);
        foreach($db['rooms']??[] as $room)if($uid&&$room['auctionId']===$a['id']&&in_array($uid,$room['members'],true))$participant=true;
        if (in_array($a['status'],['deleted','hidden'],true) && !$participant) continue;
        $a['bidHistory'] = $uid && ($a['winnerId']??null)===$uid ? [['userId'=>'me','amount'=>$a['currentPrice'],'at'=>$a['lastBidAt']??0]] : [];
        unset($a['winnerId']); $a['sellerId']=$map($a['sellerId']); $out['auctions'][]=$a;
    }
    usort($out['auctions'],fn($a,$b)=>$b['createdAt']<=>$a['createdAt']);
    foreach ($db['likes'] ?? [] as $r) if($r['uid']===$uid) $out['likes'][]=$r['auctionId'];
    foreach ($db['blocks'] ?? [] as $r) if($r['uid']===$uid) $out['blocked'][]=$r['peerId'];
    foreach ($db['bids'] ?? [] as $r) if($r['uid']===$uid) {unset($r['uid']);$r['userId']='me';$out['bids'][]=$r;}
    usort($out['bids'],fn($a,$b)=>$b['at']<=>$a['at']);
    foreach ($db['rooms'] ?? [] as $r) {
        if (!$uid || !in_array($uid,$r['members'],true)) continue;
        $peer = array_values(array_diff($r['members'],[$uid]))[0];
        $messages=[]; $unread=0;
        foreach ($db['messages'] ?? [] as $m) if ($m['roomId']===$r['id']) {
            $m['mine']=$m['uid']===$uid; if(!$m['mine'] && $m['at']>($r['read'][$uid]??0))$unread++;
            unset($m['uid'],$m['requestId']); $messages[]=$m;
        }
        usort($messages,fn($a,$b)=>$a['at']<=>$b['at']);
        $out['chats'][]=['id'=>$r['id'],'auctionId'=>$r['auctionId'],'peerId'=>$peer,'unread'=>$unread,'messages'=>$messages];
    }
    foreach ($db['trades'] ?? [] as $t) {
        foreach (['sellerId','buyerId'] as $role) if (($db['users'][$t[$role]]['publicHistory']??false) && $t['status']==='거래 완료')
            $out['publicTrades'][]=['memberId'=>$map($t[$role]),'title'=>$t['title'],'at'=>$t['at']];
        if (!$uid || !in_array($uid,[$t['sellerId'],$t['buyerId']],true)) continue;
        $t['role']=$t['sellerId']===$uid?'seller':'buyer'; $t['peerId']=$t[$t['role']==='seller'?'buyerId':'sellerId'];
        unset($t['sellerId'],$t['buyerId']); $out['trades'][]=$t;
    }
    foreach ($db['reviews'] ?? [] as $r) { $r['sellerId']=$map($r['sellerId']); if($r['uid']!==$uid)unset($r['tradeId']);unset($r['uid']);$out['reviews'][]=$r; }
    foreach (['reports','tickets','notifications'] as $kind) foreach ($db[$kind]??[] as $r) if($r['uid']===$uid) {unset($r['uid']);$out[$kind][]=$r;}
    foreach(['notifications','tickets','reports'] as $kind)usort($out[$kind],fn($a,$b)=>$b['at']<=>$a['at']);
    return $out;
}
function action(array &$db, string $uid, string $op, array $v): mixed {
    $u = $db['users'][$uid];
    check($u['status']==='active' || in_array($op,['ticket','readAll'],true),'이용이 제한된 계정입니다. 고객센터에 문의해 주세요.');
    $id = (string)($v['id'] ?? '');
    if ($op==='settings') {
        $p = $v['values'] ?? [];
        foreach (['name'=>20,'bio'=>100,'location'=>80] as $k=>$max) if(isset($p[$k]))$db['users'][$uid][$k]=field($p,$k,$max,$k==='bio'?0:1);
        if(isset($p['method'])) {check(in_array($p['method'],['둘 다','직거래','택배'],true),'거래 방식을 확인해 주세요.');$db['users'][$uid]['method']=$p['method'];}
        foreach(['publicHistory','showOnline'] as $k)if(isset($p[$k]))$db['users'][$uid][$k]=(bool)$p[$k];
        if(isset($p['interests']))$db['users'][$uid]['interests']=array_values(array_intersect((array)$p['interests'],['digital','camera','fashion','collect','life']));
        if(isset($p['dnd'])) { $q=$p['dnd'];foreach(['start','end'] as $k)check((bool)preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/',(string)($q[$k]??'')),'시간을 확인해 주세요.');$db['users'][$uid]['dnd']=['enabled'=>(bool)($q['enabled']??false),'start'=>$q['start'],'end'=>$q['end']]; }
    } elseif ($op==='like') {
        check(isset($db['auctions'][$id]) && $db['auctions'][$id]['status']==='active','진행 중인 상품이 아닙니다.');
        $key=$uid.':'.$id;$yes=!isset($db['likes'][$key]);
        if($yes)$db['likes'][$key]=['uid'=>$uid,'auctionId'=>(int)$id];else unset($db['likes'][$key]);
        $db['auctions'][$id]['likes'] += $yes?1:-1;return $yes;
    } elseif ($op==='saveAuction') {
        $p=$v['values']??[];$a=$id?($db['auctions'][$id]??null):null;
        check(!$id || ($a && $a['sellerId']===$uid && !$a['bidsCount'] && $a['status']==='active'),'입찰 전인 본인 상품만 수정할 수 있습니다.');
        $clean=[];foreach(['title'=>100,'description'=>5000,'location'=>80,'category'=>30,'subcategory'=>40,'brand'=>50,'model'=>80,'condition'=>30,'method'=>20] as $k=>$max)$clean[$k]=field($p,$k,$max,in_array($k,['brand','model'],true)?0:1);
        foreach(['startingPrice'=>1000,'minStep'=>100] as $k=>$min){check(is_int($p[$k]??null) && $p[$k]>=$min && $p[$k]<=1000000000,'금액을 확인해 주세요.');$clean[$k]=$p[$k];}
        $images=$p['images']??[];check(is_array($images)&&count($images)>=1&&count($images)<=5,'사진을 1~5장 등록해 주세요.');
        foreach($images as $src)check(is_string($src)&&preg_match('#^uploads/[a-f0-9]{32}\.(jpg|png|webp)$#',$src)===1 && isset($db['uploads'][$src]) && $db['uploads'][$src]['uid']===$uid,'본인이 올린 사진만 사용할 수 있습니다.');
        $clean['images']=$images;
        $duration=(int)($p['duration']??24);check($a || in_array($duration,[24,48,72,168],true),'진행 시간을 확인해 주세요.');
        if(!$a){$id=(string)(($db['meta']['sequence']['value']??0)+1);$db['meta']['sequence']=['value'=>(int)$id];}
        $db['auctions'][$id]=array_merge($a??['id'=>(int)$id,'sellerId'=>$uid,'bidsCount'=>0,'likes'=>0,'views'=>0,'status'=>'active','createdAt'=>now_ms(),'endTime'=>now_ms()+$duration*3600000],$clean,['currentPrice'=>$clean['startingPrice']]);return (int)$id;
    } elseif ($op==='deleteAuction') {
        $a=$db['auctions'][$id]??null;check($a&&$a['sellerId']===$uid&&!$a['bidsCount'],'입찰 기록 없는 본인 상품만 삭제할 수 있습니다.');$db['auctions'][$id]['status']='deleted';
    } elseif ($op==='bid') {
        $a=$db['auctions'][$id]??null;$amount=$v['amount']??0;
        check($a&&$a['status']==='active'&&$a['endTime']>now_ms(),'이미 종료된 경매입니다.');
        check($a['sellerId']!==$uid&&!blocked($db,$uid,$a['sellerId'])&&$db['users'][$a['sellerId']]['status']==='active','입찰할 수 없는 상품입니다.');
        $base=$a['bidsCount']?$a['currentPrice']:$a['startingPrice']-$a['minStep'];
        check(is_int($amount)&&$amount>=$base+$a['minStep']&&($amount-$base)%$a['minStep']===0&&$amount<=1000000000,'현재가가 변경되었거나 입찰 금액이 올바르지 않습니다.');
        $bid=rid();$db['bids'][$bid]=['id'=>$bid,'uid'=>$uid,'auctionId'=>(int)$id,'amount'=>$amount,'at'=>now_ms()];
        $db['auctions'][$id]=array_merge($a,['currentPrice'=>$amount,'bidsCount'=>$a['bidsCount']+1,'winnerId'=>$uid,'lastBidAt'=>now_ms()]);notice($db,$uid,'입찰 접수',$a['title']);
    } elseif ($op==='chat') {
        $a=$db['auctions'][$id]??null;check((bool)$a,'상품이 없습니다.');$peer=$a['sellerId'];
        if($peer===$uid){$t=$db['trades'][$id]??null;check((bool)$t,'낙찰 후 거래 채팅을 열 수 있습니다.');$peer=$t['buyerId'];}
        check(!blocked($db,$uid,$peer)&&$db['users'][$peer]['status']==='active','대화할 수 없는 사용자입니다.');
        foreach($db['rooms']??[] as $r)if($r['auctionId']===(int)$id&&in_array($uid,$r['members'],true)&&in_array($peer,$r['members'],true))return ['id'=>$r['id']];
        $key=rid();$db['rooms'][$key]=['id'=>$key,'auctionId'=>(int)$id,'members'=>[$uid,$peer],'read'=>[]];return ['id'=>$key];
    } elseif (in_array($op,['send','readRoom'],true)) {
        $r=$db['rooms'][$id]??null;check($r&&in_array($uid,$r['members'],true),'대화 접근 권한이 없습니다.');
        if($op==='readRoom'){$read=now_ms();foreach($db['messages']??[] as $m)if($m['roomId']===$id)$read=max($read,$m['at']);$db['rooms'][$id]['read'][$uid]=$read;return null;}
        $peer=array_values(array_diff($r['members'],[$uid]))[0];check(!blocked($db,$uid,$peer)&&$db['users'][$peer]['status']==='active','대화할 수 없는 사용자입니다.');
        $requestId=field($v,'requestId',64);foreach($db['messages']??[] as $m)if($m['uid']===$uid&&$m['requestId']===$requestId)return $m['id'];
        $at=now_ms();foreach($db['messages']??[] as $m)if($m['roomId']===$id)$at=max($at,$m['at']+1);
        $text=field($v,'text');$kind=($v['kind']??'text')==='account'?'account':'text';
        if($kind==='account'){
            $bank=field($v,'bank',30);$number=preg_replace('/[\s-]/','',field($v,'number',30));$holder=field($v,'holder',30);
            check((bool)preg_match('/^\d{6,30}$/',$number),'계좌번호를 확인해 주세요.');
            $accountKey=hash('sha256',strtolower(preg_replace('/\s/u','',$bank)).':'.$number);
            check(!isset($db['bannedAccounts'][$accountKey]),'사기 정보가 확인되어 전달이 제한된 계좌입니다. 고객센터에 문의해 주세요.');
            $db['accounts'][$accountKey.':'.$uid]=['uid'=>$uid,'bank'=>$bank,'number'=>$number,'holder'=>$holder,'key'=>$accountKey,'at'=>now_ms()];
            $text=$bank."\n".$number."\n예금주: ".$holder;
        }
        $key=rid();$db['messages'][$key]=['id'=>$key,'uid'=>$uid,'roomId'=>$id,'text'=>$text,'kind'=>$kind,'at'=>$at,'requestId'=>$requestId];
        notice($db,$peer,'새 메시지',$u['name'].'님이 메시지를 보냈어요.');return $key;
    } elseif ($op==='block') {
        check(isset($db['users'][$id])&&$id!==$uid,'사용자를 확인해 주세요.');$key=$uid.':'.$id;
        if($v['blocked']??false)$db['blocks'][$key]=['uid'=>$uid,'peerId'=>$id];else unset($db['blocks'][$key]);
    } elseif ($op==='report' || $op==='ticket') {
        $key=rid();$r=['id'=>$key,'uid'=>$uid,'status'=>'접수','at'=>now_ms()];
        if($op==='report'){check(isset($db['users'][$v['peerId']??''])&&$v['peerId']!==$uid,'신고 대상을 확인해 주세요.');$r+=['peerId'=>$v['peerId'],'auctionId'=>$v['auctionId']??null,'reason'=>field($v,'reason',80),'detail'=>field($v,'detail',2000,5)];}
        else $r+=['title'=>field($v,'title',100),'body'=>field($v,'body',3000,5),'type'=>field($v,'type',40),'mailStatus'=>'pending'];
        $db[$op==='report'?'reports':'tickets'][$key]=$r;return $key;
    } elseif ($op==='advance') {
        $t=$db['trades'][$id]??null;check($t&&in_array($uid,[$t['sellerId'],$t['buyerId']],true),'거래 권한이 없습니다.');
        $flow=['협의 중'=>['buyerId','송금 표시'],'송금 표시'=>['sellerId','전달·배송 중'],'전달·배송 중'=>['buyerId','거래 완료']];
        $next=$flow[$t['status']]??null;check($next&&$t[$next[0]]===$uid,'상대방의 확인이 필요한 단계입니다.');$db['trades'][$id]['status']=$next[1];
        foreach([$t['sellerId'],$t['buyerId']] as $p)notice($db,$p,'거래 상태 변경',$t['title'].' · '.$next[1]);
    } elseif ($op==='review') {
        $t=$db['trades'][$id]??null;check($t&&$t['status']==='거래 완료'&&in_array($uid,[$t['sellerId'],$t['buyerId']],true),'완료된 본인 거래만 평가할 수 있습니다.');
        $key=$uid.':'.$id;check(!isset($db['reviews'][$key]),'이미 후기를 작성했습니다.');$rating=$v['rating']??0;check(is_int($rating)&&$rating>=1&&$rating<=5,'평점을 확인해 주세요.');
        $db['reviews'][$key]=['id'=>rid(),'uid'=>$uid,'tradeId'=>$id,'sellerId'=>$t[$t['sellerId']===$uid?'buyerId':'sellerId'],'author'=>$u['name'],'rating'=>$rating,'text'=>field($v,'text',1000,5),'at'=>now_ms()];
    } elseif ($op==='readAll') {
        foreach($db['notifications']??[] as $key=>$n)if($n['uid']===$uid)$db['notifications'][$key]['read']=true;
    } else throw new DomainException('지원하지 않는 요청입니다.');
    return null;
}
