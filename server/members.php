<?php
declare(strict_types=1);
function member_schema(PDO $pdo): void {
    // SQLite is used only by the isolated integration tests/local verification.
    if($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite')$pdo->exec('CREATE TABLE IF NOT EXISTS bullty_members(id TEXT PRIMARY KEY,username TEXT UNIQUE,email TEXT UNIQUE,phone TEXT UNIQUE,password_hash TEXT,name TEXT NOT NULL,role TEXT NOT NULL,status TEXT NOT NULL,rating REAL,review_count INTEGER NOT NULL,profile TEXT NOT NULL)');
}
function read_members(PDO $pdo, array &$db): void {
    foreach($pdo->query('SELECT * FROM bullty_members') as $row) {
        $profile=json_decode($row['profile'],true,512,JSON_THROW_ON_ERROR);
        $db['users'][$row['id']]=array_merge($profile,['id'=>$row['id'],'username'=>$row['username'],'email'=>$row['email'],'phone'=>$row['phone']??'',
            'passwordHash'=>$row['password_hash'],'name'=>$row['name'],'role'=>$row['role'],'status'=>$row['status'],'rating'=>$row['rating']===null?null:(float)$row['rating'],'reviewCount'=>(int)$row['review_count']]);
    }
}
function member_ratings(array &$db): void {
    $totals=[];
    foreach($db['reviews']??[] as $r){$id=$r['sellerId'];$totals[$id]['sum']=($totals[$id]['sum']??0)+$r['rating'];$totals[$id]['count']=($totals[$id]['count']??0)+1;}
    foreach($db['users']??[] as $id=>$u){$count=$totals[$id]['count']??0;$db['users'][$id]['rating']=$count?round($totals[$id]['sum']/$count,2):null;$db['users'][$id]['reviewCount']=$count;}
}
function write_members(PDO $pdo, array $before, array $db): void {
    $columns=['username','email','phone','password_hash','name','role','status','rating','review_count','profile'];
    $sqlite=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite';
    $updates=implode(',',array_map(fn($c)=>$c.'='.($sqlite?'excluded.'.$c:'VALUES('.$c.')'),$columns));
    $sql='INSERT INTO bullty_members(id,'.implode(',',$columns).') VALUES('.implode(',',array_fill(0,11,'?')).') '.($sqlite?'ON CONFLICT(id) DO UPDATE SET ':'ON DUPLICATE KEY UPDATE ').$updates;
    $put=$pdo->prepare($sql);
    foreach($db['users']??[] as $id=>$u) {
        if(($before['users'][$id]??null)===$u)continue;
        $profile=$u;foreach(['id','username','email','phone','passwordHash','name','role','status','rating','reviewCount'] as $key)unset($profile[$key]);
        $put->execute([$id,$u['username']??null,($u['email']??'')?:null,($u['phone']??'')?:null,$u['passwordHash']??null,$u['name'],$u['role'],$u['status'],$u['rating']??null,$u['reviewCount']??0,json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    }
}
function username(array $v): string {
    $name=strtolower(trim((string)($v['username']??'')));
    check((bool)preg_match('/^[a-z][a-z0-9_]{3,23}$/',$name),'아이디는 영문으로 시작하는 4~24자 영문·숫자·밑줄로 입력해 주세요.');return $name;
}
function password_value(array $v, string $key='password'): string {
    $password=$v[$key]??null;
    check(is_string($password)&&strlen($password)>=10&&strlen($password)<=72,'비밀번호는 10~72바이트로 입력해 주세요.');
    return $password;
}
