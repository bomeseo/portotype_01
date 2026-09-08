<?php
// Generate a private initial-import file without connecting to any database.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/domain.php';
$dir=$argv[1]??'';check(is_dir($dir),'Provide an existing private directory outside the public web root.');
$dir=realpath($dir);$public=realpath(dirname(__DIR__));
check(!str_starts_with(strtolower($dir.DIRECTORY_SEPARATOR),strtolower($public.DIRECTORY_SEPARATOR)),'Output must be outside the public web root.');
$sqlPath=$dir.'/admin-bootstrap.sql';$secretPath=$dir.'/admin-credentials.txt';
check(!file_exists($sqlPath)&&!file_exists($secretPath),'Credentials already exist; refusing to overwrite.');
$quote=fn($s)=>"'".str_replace("'","''",$s)."'";
$sql="-- Import only after schema.sql, into the intended Bullty database.\nSTART TRANSACTION;\nSELECT id FROM bullty_lock WHERE id=1 FOR UPDATE;\n";
$secret="불티 초기 관리자 계정 (DB 비밀번호와 다름)\nadmin-bootstrap.sql을 가져온 뒤 사용할 수 있습니다. 최초 로그인 후 비밀번호 변경이 필요합니다.\n\n";
for($i=1;$i<=2;$i++){
    $id=rid();$name='bullty_admin'.$i;$password=bin2hex(random_bytes(18));$u=new_member($id,'운영자 '.$i);
    $u['passwordChangeRequired']=true;
    foreach(['id','name','role','status','phone'] as $key)unset($u[$key]);
    $profile=json_encode($u,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    $values=implode(',',array_map($quote,[$id,$name,password_hash($password,PASSWORD_DEFAULT),'운영자 '.$i,'admin','active',$profile]));
    $sql.="INSERT INTO bullty_members(id,username,password_hash,name,role,status,profile) SELECT $values WHERE NOT EXISTS (SELECT 1 FROM bullty_members WHERE username=".$quote($name).") AND (SELECT COUNT(*) FROM bullty_members WHERE role='admin')<2;\n";
    $secret.="아이디: $name\n초기 비밀번호: $password\n\n";
}
$sql.="COMMIT;\n";file_put_contents($sqlPath,$sql);file_put_contents($secretPath,$secret);chmod($secretPath,0600);chmod($sqlPath,0600);
echo "Prepared two initial administrator accounts in private files. No database was modified.\n";
