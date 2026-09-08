<?php
// Copy OUTSIDE the public web directory as bullty-config.php. Never commit real values.
return [
    'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
    'user' => 'YOUR_DATABASE_USER',
    'password' => '',
    'support_email' => '',
    'mail_from' => '',
    'require_https' => true,
    // Optional callable: function(string $phone, string $code): bool.
    // Return true only after your SMS provider has accepted the message.
    'sms_sender' => null,
];
