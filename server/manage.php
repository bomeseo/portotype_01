<?php
// CLI only. The web server must never expose this directory.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/bootstrap.php';
$op=$argv[1]??'';
if($op==='install'){
    $pdo->exec(file_get_contents(__DIR__.'/schema.sql'));
    $db=load_db($pdo);$before=$db;$before['users']=[];
    save_db($pdo,$before,$db);
    $pdo->exec("DELETE FROM bullty_records WHERE collection='users'");
    echo "Database ready; member records migrated without deleting trades.\n";exit;
}
$db=load_db($pdo);$before=$db;
if($op==='settle')settle($db);
elseif($op==='admin') {
    $email=strtolower($argv[2]??'');check((bool)filter_var($email,FILTER_VALIDATE_EMAIL),'Valid email required.');
    $admins=array_filter($db['users']??[],fn($u)=>($u['role']??'')==='admin');check(count($admins)<2,'Two administrators already exist.');
    foreach($db['users']??[] as $u)check(($u['email']??'')!==$email,'Account already exists; review identity before promotion.');
    fwrite(STDOUT,"Set BULLTY_ADMIN_PASSWORD in the process environment; never pass passwords as arguments.\n");
    $password=getenv('BULLTY_ADMIN_PASSWORD')?:'';check(strlen($password)>=12,'Administrator password must have at least 12 characters.');
    $id=rid();$db['users'][$id]=array_merge(new_member($id,$argv[3]??'운영자'),['role'=>'admin','email'=>$email,'passwordHash'=>password_hash($password,PASSWORD_DEFAULT)]);
} else { $pdo->rollBack();exit("Usage: php server/manage.php install|settle|admin EMAIL NAME\n"); }
save_db($pdo,$before,$db);echo "Done.\n";
