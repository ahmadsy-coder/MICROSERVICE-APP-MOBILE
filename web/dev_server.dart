import 'dart:convert';
import 'dart:async';
import 'dart:io';

const _hopByHopHeaders = {
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
};

Future<void> main(List<String> arguments) async {
  final options = <String, String>{};
  for (final argument in arguments) {
    final separator = argument.indexOf('=');
    if (argument.startsWith('--') && separator > 2) {
      options[argument.substring(2, separator)] = argument.substring(
        separator + 1,
      );
    }
  }

  final port = int.tryParse(options['port'] ?? '') ?? 5173;
  final bankUrl = (options['bank'] ?? 'http://127.0.0.1:8081').replaceFirst(
    RegExp(r'/$'),
    '',
  );
  final serviceUrl = (options['service'] ?? 'http://127.0.0.1:8082')
      .replaceFirst(RegExp(r'/$'), '');
  final root = File.fromUri(Platform.script).parent.absolute;
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, port);
  final client = HttpClient();

  stdout.writeln('Nikitin web est disponible sur http://127.0.0.1:$port');
  stdout.writeln('API banque : $bankUrl');
  stdout.writeln('API services : $serviceUrl');
  await for (final request in server) {
    unawaited(_handleRequest(request, root, client, bankUrl, serviceUrl));
  }
}

Future<void> _handleRequest(
  HttpRequest incoming,
  Directory root,
  HttpClient client,
  String bankUrl,
  String serviceUrl,
) async {
  final path = incoming.uri.path;
  if (path.startsWith('/api/bank/')) {
    await _proxyRequest(incoming, client, bankUrl, '/api/bank');
    return;
  }
  if (path.startsWith('/api/service/')) {
    await _proxyRequest(incoming, client, serviceUrl, '/api/service');
    return;
  }
  await _serveFile(incoming, root);
}

Future<void> _proxyRequest(
  HttpRequest incoming,
  HttpClient client,
  String baseUrl,
  String prefix,
) async {
  final target = Uri.parse(
    '$baseUrl${incoming.uri.path.substring(prefix.length)}',
  ).replace(query: incoming.uri.hasQuery ? incoming.uri.query : null);

  try {
    final upstream = await client.openUrl(incoming.method, target);
    incoming.headers.forEach((name, values) {
      if (!_hopByHopHeaders.contains(name.toLowerCase()) &&
          name.toLowerCase() != 'host') {
        upstream.headers.set(name, values);
      }
    });
    await upstream.addStream(incoming);
    final response = await upstream.close();
    incoming.response.statusCode = response.statusCode;
    response.headers.forEach((name, values) {
      if (!_hopByHopHeaders.contains(name.toLowerCase())) {
        incoming.response.headers.set(name, values);
      }
    });
    await response.pipe(incoming.response);
  } on SocketException catch (error) {
    incoming.response
      ..statusCode = HttpStatus.badGateway
      ..headers.contentType = ContentType.json;
    incoming.response.write(
      jsonEncode({'message': 'API indisponible : ${error.message}'}),
    );
    await incoming.response.close();
  } on HttpException catch (error) {
    incoming.response
      ..statusCode = HttpStatus.badGateway
      ..headers.contentType = ContentType.json;
    incoming.response.write(
      jsonEncode({
        'message': 'Erreur de communication avec l’API : ${error.message}',
      }),
    );
    await incoming.response.close();
  }
}

Future<void> _serveFile(HttpRequest request, Directory root) async {
  if (request.method != 'GET' && request.method != 'HEAD') {
    request.response
      ..statusCode = HttpStatus.methodNotAllowed
      ..headers.set(HttpHeaders.allowHeader, 'GET, HEAD');
    await request.response.close();
    return;
  }

  final segments = request.uri.pathSegments
      .where((segment) => segment.isNotEmpty)
      .toList();
  if (segments.any((segment) => segment == '.' || segment == '..')) {
    request.response.statusCode = HttpStatus.forbidden;
    await request.response.close();
    return;
  }
  final relativePath = segments.isEmpty
      ? 'index.html'
      : segments.join(Platform.pathSeparator);
  final file = File('${root.path}${Platform.pathSeparator}$relativePath')
      .absolute;
  final rootPrefix = '${root.path}${Platform.pathSeparator}';
  if (!file.path.startsWith(rootPrefix)) {
    request.response.statusCode = HttpStatus.forbidden;
    await request.response.close();
    return;
  }

  if (!await file.exists()) {
    request.response.statusCode = HttpStatus.notFound;
    await request.response.close();
    return;
  }

  request.response.headers.contentType = _contentType(file.path);
  if (request.method == 'HEAD') {
    await request.response.close();
    return;
  }
  await file.openRead().pipe(request.response);
}

ContentType _contentType(String path) {
  if (path.endsWith('.html')) return ContentType.html;
  if (path.endsWith('.css'))
    return ContentType('text', 'css', charset: 'utf-8');
  if (path.endsWith('.js'))
    return ContentType('application', 'javascript', charset: 'utf-8');
  if (path.endsWith('.json')) return ContentType.json;
  if (path.endsWith('.svg')) return ContentType('image', 'svg+xml');
  if (path.endsWith('.png')) return ContentType('image', 'png');
  return ContentType.binary;
}
