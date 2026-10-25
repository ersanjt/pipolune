<?php
declare(strict_types=1);

namespace Pipolune;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler];
    }

    public function get(string $p, callable $h): void { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void { $this->add('POST', $p, $h); }
    public function patch(string $p, callable $h): void { $this->add('PATCH', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    public function dispatch(string $method, string $path): mixed
    {
        $allowed = false;
        foreach ($this->routes as [$m, $regex, $handler]) {
            if (preg_match($regex, $path, $match)) {
                if ($m !== $method) {
                    $allowed = true;
                    continue;
                }
                $params = array_map('rawurldecode', array_filter($match, 'is_string', ARRAY_FILTER_USE_KEY));
                return $handler($params);
            }
        }
        throw $allowed ? new ApiError(405, 'method_not_allowed') : ApiError::notFound('route_not_found');
    }
}
