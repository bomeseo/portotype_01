<?php
// PHP's development server does not read Apache .htaccess files.
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)??'/');
if(str_contains($path,'..') || !preg_match('#^/(?:$|index\.html$|api/index\.php$|(?:app|styles)/[a-zA-Z0-9/._-]+\.(?:js|css)$|uploads/[a-f0-9]{32}\.jpg$)#',$path)) {
    http_response_code(404);echo 'Not found';return true;
}
return false;
