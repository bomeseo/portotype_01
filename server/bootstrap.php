<?php
declare(strict_types=1);
require_once __DIR__.'/domain.php';
require_once __DIR__.'/members.php';
$configPath = getenv('BULLTY_CONFIG') ?: dirname(__DIR__, 2).'/bullty-config.php';
if (!is_file($configPath)) throw new RuntimeException('서버 연결 설정이 아직 준비되지 않았습니다.');
$config = require $configPath;
$pdo = new PDO($config['dsn'], $config['user'] ?? '', $config['password'] ?? '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false]);
function load_db(PDO $pdo): array {
    $pdo->beginTransaction();
    if($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite')$pdo->exec('UPDATE bullty_lock SET id=id WHERE id=1');
    else $pdo->query('SELECT id FROM bullty_lock WHERE id=1 FOR UPDATE')->fetch();
    $db=[];foreach($pdo->query('SELECT collection,id,payload FROM bullty_records') as $row)$db[$row['collection']][$row['id']]=json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);
    read_members($pdo,$db);
    return $db;
}
function save_db(PDO $pdo, array $before, array &$db): void {
    member_ratings($db);
    write_members($pdo,$before,$db);
    $suffix=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite'?'ON CONFLICT(collection,id) DO UPDATE SET payload=excluded.payload':'ON DUPLICATE KEY UPDATE payload=VALUES(payload)';
    $put=$pdo->prepare('INSERT INTO bullty_records(collection,id,payload) VALUES(?,?,?) '.$suffix);
    $del=$pdo->prepare('DELETE FROM bullty_records WHERE collection=? AND id=?');
    foreach($db as $kind=>$rows)if($kind!=='users')foreach($rows as $id=>$r)if(($before[$kind][$id]??null)!==$r)$put->execute([$kind,(string)$id,json_encode($r,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    foreach($before as $kind=>$rows)foreach($rows as $id=>$r)if(!isset($db[$kind][$id]))$del->execute([$kind,(string)$id]);
    $pdo->commit();
}
function rate_limit(PDO $pdo, string $key, int $limit, int $window): void {
    $db=load_db($pdo);$before=$db;$now=time();
    foreach($db['limits']??[] as $k=>$r)if($r['expires']<$now)unset($db['limits'][$k]);
    $key=hash('sha256',$key);$r=$db['limits'][$key]??['count'=>0,'expires'=>$now+$window];
    $r['count']++;$db['limits'][$key]=$r;save_db($pdo,$before,$db);
    check($r['count']<=$limit,'요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
}
function admin_action(array &$db, string $uid, string $op, array $v): mixed {
    check(($db['users'][$uid]['role']??'')==='admin'&&$db['users'][$uid]['status']==='active','관리자 권한이 필요합니다.');
    check(!($db['users'][$uid]['passwordChangeRequired']??false),'관리자 초기 비밀번호를 먼저 변경해 주세요.');
    if($op==='adminList')return ['users'=>array_map(function($u){unset($u['passwordHash']);return $u;},array_values($db['users']??[])), 'accounts'=>array_values($db['accounts']??[]),'fraud'=>array_values($db['fraud']??[]),'reports'=>array_values($db['reports']??[]),'tickets'=>array_values($db['tickets']??[]),'audit'=>array_slice(array_values($db['audit']??[]),-100)];
    $id=field($v,'id',64);$reason=field($v,'reason',2000,3);
    if($op==='adminFraud') {
        check(isset($db['users'][$id])&&$db['users'][$id]['role']!=='admin','사기 확인 대상을 선택해 주세요.');
        $key=rid();$kind=($v['kind']??'')==='account'?'account':'phone';
        if($kind==='phone'){
            $value=$db['users'][$id]['phone']??'';check($value!==''&&$db['users'][$id]['verified'],'해당 회원의 인증된 전화번호가 없습니다.');
            $db['bannedPhones'][$value]=['reason'=>$reason,'at'=>now_ms(),'fraudId'=>$key];
        } else {
            $value=field($v,'accountKey',100);$account=$db['accounts'][$value.':'.$id]??null;
            check($account&&$account['uid']===$id,'해당 회원이 채팅으로 전달한 계좌를 선택해 주세요.');
            $db['bannedAccounts'][$value]=['reason'=>$reason,'at'=>now_ms(),'fraudId'=>$key];
        }
        $db['fraud'][$key]=['id'=>$key,'memberId'=>$id,'kind'=>$kind,'status'=>'confirmed','reason'=>$reason,'at'=>now_ms(),'adminId'=>$uid];
        restrict_member($db,$id);$db['users'][$id]['fraudConfirmed']=true;
    } elseif($op==='adminUser') {
        check(isset($db['users'][$id])&&($db['users'][$id]['role']??'')!=='admin','관리자 계정은 이 화면에서 제재할 수 없습니다.');
        $ban=(bool)($v['banned']??false);check($ban||!($db['users'][$id]['fraudConfirmed']??false),'사기 확정 제재는 일반 이용 제한 해제로 풀 수 없습니다.');
        if($ban)restrict_member($db,$id);else $db['users'][$id]['status']='active';
        $phone=$db['users'][$id]['phone']??'';
        if($phone){if($ban)$db['bannedPhones'][$phone]=['reason'=>$reason,'at'=>now_ms()];else unset($db['bannedPhones'][$phone]);}
    } elseif($op==='adminTicket') {
        $kind=($v['kind']??'')==='reports'?'reports':'tickets';check(isset($db[$kind][$id]),'접수 내역이 없습니다.');
        $db[$kind][$id]['answer']=$reason;$db[$kind][$id]['status']='답변 완료';notice($db,$db[$kind][$id]['uid'],'고객센터 답변','접수 내역에서 답변을 확인해 주세요.');
    } elseif($op==='adminAuction') {
        check(isset($db['auctions'][$id]),'상품이 없습니다.');$db['auctions'][$id]['status']='hidden';
        if(isset($db['trades'][$id])&&$db['trades'][$id]['status']!=='거래 완료')$db['trades'][$id]['status']='거래 중지';
    } else throw new DomainException('지원하지 않는 관리자 요청입니다.');
    $key=rid();$db['audit'][$key]=['id'=>$key,'uid'=>$uid,'action'=>$op,'target'=>$id,'reason'=>$reason,'at'=>now_ms()];return null;
}
