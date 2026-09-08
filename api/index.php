<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
ini_set('display_errors','0');
try {
    require __DIR__.'/../server/bootstrap.php';
    $https=isset($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off';
    check(!($config['require_https']??true)||$https,'보안 연결(HTTPS)로 접속해 주세요.');
    session_set_cookie_params(['httponly'=>true,'secure'=>$https,'samesite'=>'Lax','path'=>'/']);
    ini_set('session.use_strict_mode','1');session_start();
    if(!isset($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(32));
    $method=$_SERVER['REQUEST_METHOD'];$v=[];
    if($method==='POST') {
        check(hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''),'세션이 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
        check((int)($_SERVER['CONTENT_LENGTH']??0)<=8*1024*1024,'요청 크기가 너무 큽니다.');
        $v=json_decode(file_get_contents('php://input'),true,32,JSON_THROW_ON_ERROR);check(is_array($v),'요청을 확인해 주세요.');
    } else check($method==='GET','지원하지 않는 요청 방식입니다.');
    $op=$method==='GET'?'state':(string)($v['op']??'');
    rate_limit($pdo,'request:'.($_SERVER['REMOTE_ADDR']??''),240,60);
    if(in_array($op,['login','register','requestCode','verifyCode','changePassword'],true))rate_limit($pdo,'auth:'.($_SERVER['REMOTE_ADDR']??''),20,3600);
    $db=load_db($pdo);$before=$db;settle($db);$result=null;
    $uid=$_SESSION['uid']??null;
    if($uid&&!isset($db['users'][$uid]))$uid=null;
    if($uid && ($_SESSION['version']??0)!==($db['users'][$uid]['sessionVersion']??0)){unset($_SESSION['uid']);$uid=null;}
    if($op==='logout') {unset($_SESSION['uid']);$uid=null;session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));}
    elseif($op==='login'||$op==='register') {
        $identity=strtolower(trim((string)($v['identity']??$v['email']??$v['username']??'')));
        $password=password_value($v);$found=null;
        foreach($db['users']??[] as $key=>$u)if($identity!==''&&(($u['email']??'')===$identity||($u['username']??'')===$identity))$found=$key;
        if($op==='register') {
            $name=username($v);$email=strtolower(field($v,'email',254));check((bool)filter_var($email,FILTER_VALIDATE_EMAIL),'이메일을 확인해 주세요.');
            check(!str_starts_with($name,'bullty_admin'),'사용할 수 없는 아이디입니다.');
            foreach($db['users']??[] as $u)check(($u['username']??'')!==$name&&($u['email']??'')!==$email,'이미 사용 중인 아이디 또는 이메일입니다.');
            $uid=rid();$db['users'][$uid]=new_member($uid,field($v,'name',20))+['username'=>$name,'email'=>$email,'passwordHash'=>password_hash($password,PASSWORD_DEFAULT)];
        } else {
            check($found && password_verify($password,$db['users'][$found]['passwordHash']??''),'아이디 또는 비밀번호가 올바르지 않습니다.');$uid=$found;
        }
        session_regenerate_id(true);$_SESSION['uid']=$uid;$_SESSION['csrf']=bin2hex(random_bytes(32));
        $_SESSION['version']=$db['users'][$uid]['sessionVersion']??0;
    } elseif($op==='changePassword') {
        check((bool)$uid,'로그인이 필요합니다.');
        check(password_verify((string)($v['currentPassword']??''),$db['users'][$uid]['passwordHash']??''),'현재 비밀번호가 올바르지 않습니다.');
        $password=password_value($v,'newPassword');check(!password_verify($password,$db['users'][$uid]['passwordHash']),'다른 새 비밀번호를 입력해 주세요.');
        $db['users'][$uid]['passwordHash']=password_hash($password,PASSWORD_DEFAULT);
        $db['users'][$uid]['sessionVersion']=($db['users'][$uid]['sessionVersion']??0)+1;
        $db['users'][$uid]['passwordChangeRequired']=false;
        session_regenerate_id(true);$_SESSION['version']=$db['users'][$uid]['sessionVersion'];$_SESSION['csrf']=bin2hex(random_bytes(32));
    } elseif($op==='requestCode') {
        $phone=preg_replace('/\D/','',field($v,'phone',20));check((bool)preg_match('/^010\d{8}$/',$phone),'휴대폰 번호를 확인해 주세요.');
        check(!isset($db['bannedPhones'][$phone]),'가입이 제한된 번호입니다. 고객센터에 문의해 주세요.');
        check(is_callable($config['sms_sender']??null),'문자 인증 서비스가 아직 연결되지 않았습니다. 이메일 로그인을 이용해 주세요.');
        $old=$db['codes'][$phone]??[];check(now_ms()-($old['sentAt']??0)>=60000,'인증번호 재전송은 1분 뒤 가능합니다.');
        $code=(string)random_int(100000,999999);check(($config['sms_sender'])($phone,$code)===true,'문자를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
        $db['codes'][$phone]=['hash'=>password_hash($code,PASSWORD_DEFAULT),'expires'=>now_ms()+180000,'sentAt'=>now_ms(),'failures'=>0,'session'=>hash('sha256',session_id())];
    } elseif($op==='verifyCode') {
        $phone=preg_replace('/\D/','',field($v,'phone',20));$c=$db['codes'][$phone]??null;
        check($c&&$c['expires']>now_ms()&&$c['failures']<5&&$c['session']===hash('sha256',session_id()),'인증번호가 만료되었거나 입력 횟수를 초과했습니다.');
        if(!password_verify((string)($v['code']??''),$c['hash'])) {$db['codes'][$phone]['failures']++;save_db($pdo,$before,$db);throw new DomainException('인증번호가 일치하지 않습니다.');}
        check(!isset($db['bannedPhones'][$phone]),'이용이 제한된 번호입니다.');
        $found=null;foreach($db['users']??[] as $key=>$u)if(($u['phone']??'')===$phone)$found=$key;
        check(!$uid||!$found||$uid===$found,'다른 계정에 연결된 전화번호입니다.');
        $uid=$uid??$found??rid();if(!isset($db['users'][$uid]))$db['users'][$uid]=new_member($uid,'회원'.substr($uid,0,6));
        $db['users'][$uid]['phone']=$phone;$db['users'][$uid]['verified']=true;unset($db['codes'][$phone]);
        session_regenerate_id(true);$_SESSION['uid']=$uid;$_SESSION['csrf']=bin2hex(random_bytes(32));
        $_SESSION['version']=$db['users'][$uid]['sessionVersion']??0;
    } elseif($op==='upload') {
        check($uid && $db['users'][$uid]['status']==='active','로그인이 필요합니다.');
        $src=(string)($v['image']??'');check((bool)preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s',$src,$m),'지원하지 않는 사진입니다.');
        $bytes=base64_decode($m[2],true);check($bytes!==false&&strlen($bytes)<=5*1024*1024,'사진은 5MB 이하로 올려주세요.');
        $info=@getimagesizefromstring($bytes);check($info&&in_array($info['mime'],['image/jpeg','image/png','image/webp'],true)&&$info[0]<=5000&&$info[1]<=5000,'이미지를 확인해 주세요.');
        check(function_exists('imagecreatefromstring'),'서버 이미지 처리 기능을 설정해 주세요.');$image=@imagecreatefromstring($bytes);check((bool)$image,'사진을 처리하지 못했습니다.');
        $path='uploads/'.rid().'.jpg';$target=__DIR__.'/../'.$path;check(imagejpeg($image,$target,85),'사진을 저장하지 못했습니다.');imagedestroy($image);
        $db['uploads'][$path]=['uid'=>$uid,'at'=>now_ms()];$result=$path;
    } elseif($op!=='state'&&$op!=='logout') {
        check((bool)$uid,'로그인이 필요합니다.');
        $result=str_starts_with($op,'admin')?admin_action($db,$uid,$op,$v):action($db,$uid,$op,$v);
    }
    if($uid && $db['users'][$uid]['status']==='active')$db['users'][$uid]['lastSeen']=now_ms();
    save_db($pdo,$before,$db);
    // Persist ticket before attempting email; mail failure cannot erase the enquiry.
    if($op==='ticket' && $result) {
        $ticket=$db['tickets'][$result];$sent=false;
        if(filter_var($config['support_email']??'',FILTER_VALIDATE_EMAIL)&&filter_var($config['mail_from']??'',FILTER_VALIDATE_EMAIL))
            $sent=@mail($config['support_email'],'=?UTF-8?B?'.base64_encode('[불티 문의] '.$ticket['title']).'?=',$ticket['body']."\n\n접수번호: ".$result,"From: ".$config['mail_from']."\r\nContent-Type: text/plain; charset=UTF-8");
        $db=load_db($pdo);$before=$db;$db['tickets'][$result]['mailStatus']=$sent?'accepted':'failed';save_db($pdo,$before,$db);
    }
    echo json_encode(['ok'=>true,'result'=>$result,'state'=>snapshot($db,$uid),'csrf'=>$_SESSION['csrf']],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
} catch(Throwable $e) {
    if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
    http_response_code($e instanceof DomainException?400:503);
    if(!($e instanceof DomainException))error_log('Bullty API: '.get_class($e));
    echo json_encode(['ok'=>false,'error'=>$e instanceof DomainException?$e->getMessage():'서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'],JSON_UNESCAPED_UNICODE);
}
