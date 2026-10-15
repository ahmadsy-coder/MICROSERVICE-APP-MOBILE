# Client web Nikitin

Le client web est indépendant de Flutter et utilise HTML, CSS et JavaScript sans dépendances npm.

## Lancer en local

Depuis la racine du dépôt, dans PowerShell :

```powershell
$dart = Get-Command dart -ErrorAction SilentlyContinue
if ($dart) {
  dart web\dev_server.dart
} else {
  & "$env:LOCALAPPDATA\FlutterSDK\flutter\bin\dart.bat" web\dev_server.dart
}
```

Ouvrez ensuite <http://127.0.0.1:5173>. Le serveur relaie les appels `/api/bank/*` vers `http://127.0.0.1:8081` et `/api/service/*` vers `http://127.0.0.1:8082`. Les microservices et leurs bases de données doivent être démarrés pour utiliser les fonctions du portefeuille.

Les URLs et le port peuvent être remplacés au lancement :

```powershell
dart web\dev_server.dart --port=5173 --bank=http://127.0.0.1:8081 --service=http://127.0.0.1:8082
```

## Tester le portefeuille

Utilisez l'un des comptes de démonstration :

- Téléphone : `+221771000001` — PIN : `1234`
- Téléphone : `+221771000002` — PIN : `1234`

La session de test en cours utilise des bases H2 en mémoire plutôt que PostgreSQL. Les soldes, opérations et demandes sont temporaires et disparaissent au redémarrage des services. Le catalogue de démonstration visible dans cette session disparaîtra également si le microservice `service` est redémarré.

L’historique de transactions reste limité à la session du navigateur, car l’API bancaire ne propose pas encore de point de terminaison pour le récupérer.
