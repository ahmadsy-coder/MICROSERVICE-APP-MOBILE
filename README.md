MICROSERVICE-APP-MOBILE
Présentation rapide

Ensemble microservices + client mobile (wallet) : contient au moins deux services backend Java/Spring Boot (bank et service) et une application mobile Flutter (wallet_app). Le dépôt inclut des fichiers docker-compose pour démarrer les bases de données PostgreSQL nécessaires.
Stack

Backend : Java (Maven) — Spring Boot
bank : projet Maven (package racine sn.l3gl.banque.api) — serveur sur le port 8081
service : projet Maven (package com.service.service) — serveur sur le port 8082
Mobile : Flutter (wallet_app)
Bases de données : PostgreSQL (containers définis dans docker-compose)
Arborescence importante (extrait)

bank/ — microservice banque (Maven, Spring Boot)
pom.xml
mvnw, mvnw.cmd
src/main/java/sn/l3gl/banque/... (Application.java)
src/main/resources/application.yaml, application-dev.yaml, data.sql
docker/docker-compose.yml
service/ — microservice paiement/prestation (Maven, Spring Boot)
pom.xml
.env.example
mvnw, mvnw.cmd
src/main/resources/application.yaml
wallet_app/ — application Flutter
pubspec.yaml, README.md
docker-compose.yml (root) — lève deux bases Postgres (banque & prestation)
Ce qui suit explique comment tout lancer et configurer pas à pas.

Prérequis

Docker et Docker Compose installés et opérationnels
Java JDK (version compatible indiquée dans les pom.xml — propriété java.version ; installez une JDK récente, ex. 17+ ou la version cible)
Maven wrapper est fourni (mvnw) — vous pouvez utiliser ./mvnw sans installer Maven globalement
Flutter SDK installé pour exécuter wallet_app (si vous voulez lancer l'app mobile)
Un terminal / client REST (curl, httpie, Postman) pour tester les endpoints
Démarrer les bases de données (rapide) Depuis la racine du dépôt :
bash
# Lève les bases PostgreSQL (containers et volumes nommés)
docker compose up -d
Ce docker-compose crée deux services DB :

postgres_banque → container db_banque, port hôte 5434 -> container 5432
BD : banque_221
USER : banque_user
PASS : banque_password
postgres_prestation → container db_prestation, port hôte 5435 -> container 5432
BD : prestation_221
USER : prestation_user
PASS : prestation_password
Remarques :

Si vous ne souhaitez lancer que la DB pour le service banque, un compose dédié existe dans bank/docker/docker-compose.yml :
bash
cd bank/docker
docker compose up -d
Lancer le service "bank" (Spring Boot) Configuration observée :
Port : 8081
JDBC : jdbc:postgresql://localhost:5434/banque_221
user/password : banque_user / banque_password
Endpoints Swagger : /swagger-ui (=> http://localhost:8081/swagger-ui)
Données initiales : data.sql dans resources (sera exécuté si la config d'initialisation est active)
Utilisateurs par défaut (dans application.yaml) :
admin / admin123 (ROLE: ADMIN)
user1 / user123 (ROLE: USER)
agent1 / agent123 (ROLE: AGENT)
JWT secret & expiration définis dans application.yaml
Commandes pour build & run :

bash
cd bank
# construire
./mvnw clean package

# exécuter le JAR généré
java -jar target/*.jar

# ou lancer directement via Maven (dev)
./mvnw spring-boot:run
Vérifier :

Swagger UI : http://localhost:8081/swagger-ui
API docs JSON : http://localhost:8081/api-docs
Lancer le service "service" (paiement/prestation) Configuration observée :
Port : 8082
JDBC par défaut (file application.yaml) : jdbc:postgresql://localhost:5435/prestation_221 (username prestation_user / prestation_password)
Le service lit aussi des variables d'environnement via dotenv ; un exemple .env.example est fourni (service/.env.example).
Il consomme un service de paiement (PAYMENT_BASE_URL) qui par défaut pointe sur http://localhost:8081 (bank).
Fichier .env.example (extrait) :

Code
PAYMENT_BASE_URL=http://localhost:8081
PAYMENT_AUTH_USERNAME=
PAYMENT_AUTH_PASSWORD=
PAYMENT_LOGIN_PATH=/api/auth/login
PAYMENT_INIT_PATH=/api/paiements/prestation
Commandes pour build & run :

bash
cd service
# copier l'exemple d'env en .env et l'adapter si besoin
cp .env.example .env
# (optionnel) éditer .env pour renseigner PAYMENT_AUTH_USERNAME/PASSWORD si nécessaire

# construire
./mvnw clean package

# exécuter le JAR
java -jar target/*.jar

# ou exécuter en dev
./mvnw spring-boot:run
Remarques :

Le service charge la configuration depuis un .env si présent (dot-env) et injecte dans les propriétés système.
Vérifiez que PAYMENT_BASE_URL pointe vers le service bank si le paiement doit être simulé par bank (ex : http://localhost:8081).
Endpoints utiles :

Swagger UI service : http://localhost:8082/swagger-ui
OpenAPI JSON : http://localhost:8082/v3/api-docs (selon configuration)
Lancer l'application mobile Flutter (wallet_app) Prerequis : Flutter SDK installé, un émulateur ou device connecté.
Commandes de base :

bash
cd wallet_app
flutter pub get

# lancer sur un émulateur ou appareil connecté
flutter run

# lancer sur Chrome (web)
flutter run -d chrome

# générer un APK
flutter build apk
Configurer l'URL des API :

Par défaut, la configuration réseau dans le client doit pointer vers les API locales (bank/service). Si le code contient une constante API_BASE_URL, modifiez-la (ex : lib/config.dart, lib/constants.dart ou similaire).
Alternative : pour injecter au build, utilisez --dart-define :
bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
Remarque : lors d'un émulateur Android, localhost du device n'est pas le même que l'hôte : utilisez 10.0.2.2 (Android Emulator) ou 127.0.0.1 selon l'environnement. Pour iOS simulateur localhost fonctionne.
Flux de démarrage minimal complet (depuis une machine dév)
Démarrer les DB : docker compose up -d
Lancer bank : cd bank && ./mvnw spring-boot:run
Lancer service : cd service && ./mvnw spring-boot:run
ou utiliser .env pour pointer PAYMENT_BASE_URL vers le bank si le service appel le bank
Lancer le client Flutter : cd wallet_app && flutter pub get && flutter run (avec dart-define si nécessaire)
Manipulations courantes & maintenance
Réinitialiser les données des bases (supprime volumes) :
bash
docker compose down -v
docker compose up -d
Voir logs :
bash
docker compose logs -f
# ou pour un service particulier
docker compose logs -f db_banque
Accéder à une console psql (depuis machine hôte) :
bash
# si psql installé localement
psql -h localhost -p 5434 -U banque_user -d banque_221
Modifier utilisateurs / mots de passe : éditer bank/src/main/resources/application.yaml (pour utilisateurs codés en dur) ou intégrer un store sécurisé.
Variables importantes (récapitulatif)
Banque (bank)
URL JDBC : jdbc:postgresql://localhost:5434/banque_221
USER : banque_user
PASS : banque_password
Port service : 8081
Prestation (service)
URL JDBC : jdbc:postgresql://localhost:5435/prestation_221
USER : prestation_user
PASS : prestation_password
Port service : 8082
Fichiers :
root/docker-compose.yml
bank/src/main/resources/application.yaml
service/src/main/resources/application.yaml
service/.env.example
Points d'attention & dépannage
Java version : vérifiez la version Java requise dans pom.xml (propriété java.version). Utiliser une JDK compatible.
Ports : si 5434/5435/8081/8082 sont occupés, modifiez docker-compose et application.yaml ou arrêtez services locaux.
Lombok : pour compiler/editer en IDE, activez l'annotation processing pour Lombok.
Erreurs de connexion DB : vérifier que les containers DB sont bien démarrés et que les ports mappés sont corrects.
Emulateur Android : pour accéder à localhost depuis l'émulateur, utilisez 10.0.2.2.
Suggestions d'améliorations (à ajouter au repo)
README dédiés dans bank/ et service/ (run, env vars, endpoints)
Dockerfile pour chaque service pour pouvoir exécuter tout le stack via docker-compose multi-service
Fichier .env.example à la racine pour décrire les variables communes
Tests automatisés et CI
Contribution
Ouvrir issues pour bugs / demandes
Proposer PR avec documentation (README + Dockerfile + env examples)
Pour modifications d'API, documenter les contrats et mettre à jour wallet_app
Fin — si vous souhaitez, je peux : fournir un README.md prêt à committer (fichier complet en français), ajouter exemples .env, ou générer Dockerfile pour chaque service afin d'exécuter tout le système via docker-compose. Dites-moi lequel vous préférez.

 fournir un README.md prêt à committer
Fadloulahi14 / MICROSERVICE-APP-MOBILE / README.md
# MICROSERVICE-APP-MOBILE

Projet microservices + application mobile (wallet) — backend en Java / Spring Boot (plusieurs services) et client Flutter. Ce README explique en français comment configurer, lancer et tester l'ensemble en local.

## Aperçu
- Backend bank : Java Spring Boot (package racine `sn.l3gl.banque.api`), service principal sur le port `8081`.
bank/ # microservice banque (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd src/main/java/sn/l3gl/banque/... src/main/resources/application.yaml docker/docker-compose.yml

service/ # service prestation/paiement (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd .env.example src/main/resources/application.yaml

wallet_app/ # application Flutter pubspec.yaml README.md (Flutter)

docker-compose.yml # compose racine : lève les DB PostgreSQL

Code

---

## Prérequis
- Docker & Docker Compose
- JDK compatible (vérifier `java.version` dans les `pom.xml`; JDK 17+ recommandé)
- Git
- Flutter SDK (si vous lancez `wallet_app`)
- (Optionnel) `psql` si vous voulez interroger les bases depuis l'hôte

---

## Valeurs de configuration observées (par défaut)
### Bases de données (root docker-compose)
- postgres_banque
  - container: `db_banque`
  - port hôte -> container : `5434:5432`
  - DB: `banque_221`
  - USER: `banque_user`
  - PASS: `banque_password`
- postgres_prestation
  - container: `db_prestation`
  - port hôte -> container : `5435:5432`
  - DB: `prestation_221`
  - USER: `prestation_user`
  - PASS: `prestation_password`

### Service bank (bank/src/main/resources/application.yaml)
- Port service : `8081`
- JDBC : `jdbc:postgresql://localhost:5434/banque_221`
- Utilisateurs par défaut (pour tests) :
  - `admin` / `admin123` (ROLE: ADMIN)
  - `user1` / `user123` (ROLE: USER)
  - `agent1` / `agent123` (ROLE: AGENT)
- JWT secret et expiration configurés dans `application.yaml`.

### Service (service/src/main/resources/application.yaml)
- Port service : `8082`
- JDBC : `jdbc:postgresql://localhost:5435/prestation_221`
- Le service lit des variables d'environnement (via Dotenv). Exemple `service/.env.example` :
PAYMENT_BASE_URL=http://localhost:8081 PAYMENT_AUTH_USERNAME= PAYMENT_AUTH_PASSWORD= PAYMENT_LOGIN_PATH=/api/auth/login PAYMENT_INIT_PATH=/api/paiements/prestation

Code

---

## Lancer l'environnement local (pas à pas)

1) Cloner le dépôt
```bash
git clone https://github.com/Fadloulahi14/MICROSERVICE-APP-MOBILE.git
cd MICROSERVICE-APP-MOBILE
Démarrer les bases PostgreSQL (racine)
bash
docker compose up -d
Vérifier les containers :
bash
docker compose ps
Lancer le microservice bank
bash
cd bank
# construire
./mvnw clean package

# lancer le JAR (après build)
java -jar target/*.jar

# ou en dev (hot reload limitée)
./mvnw spring-boot:run
Swagger UI (si actif) : http://localhost:8081/swagger-ui
API docs : http://localhost:8081/api-docs ou /v3/api-docs selon config
Lancer le service (prestation/paiement)
bash
cd service
# copier .env exemple et l'adapter si besoin
cp .env.example .env
# (éditer .env si nécessaire : PAYMENT_*)

# construire
./mvnw clean package

# lancer
java -jar target/*.jar
# ou
./mvnw spring-boot:run
Swagger UI : http://localhost:8082/swagger-ui
Vérifiez que PAYMENT_BASE_URL dans .env pointe vers le bank (ex: http://localhost:8081) si ce service doit appeler le service bank.
Lancer l'application Flutter (wallet_app)
bash
cd wallet_app
flutter pub get

# lancer sur émulateur / appareil
flutter run

# pour exécuter avec une API différente
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
Remarques :

Sur Android Emulator, 10.0.2.2 référence l'hôte (utilisez plutôt localhost sur iOS Simulator).
Adaptez la config réseau du client si nécessaire (rechercher où l'URL API est définie dans le code Flutter).
Commandes utiles et dépannage
Voir logs compose :
bash
docker compose logs -f
Supprimer volumes DB (réinitialiser données) :
bash
docker compose down -v
docker compose up -d
Se connecter à PostgreSQL (depuis hôte si psql installé) :
bash
psql -h localhost -p 5434 -U banque_user -d banque_221
# ou pour prestation
psql -h localhost -p 5435 -U prestation_user -d prestation_221
Si les ports sont occupés : modifier les mappings dans docker-compose.yml ou arrêter les services qui occupent ces ports.

Erreurs de compilation liées à Lombok : activer l'annotation processing dans votre IDE (IntelliJ / Eclipse) et installer le plugin Lombok si besoin.

Tests rapides (vérifications post-démarrage)
Bank up : curl health / swagger
bash
curl -I http://localhost:8081/actuator/health  # si actuator activé
# ou accéder à swagger UI: http://localhost:8081/swagger-ui
Service up :
bash
curl -I http://localhost:8082/actuator/health
Tester endpoint de paiement (exemples) : consultez les routes exposées par /api via Swagger.
Bonnes pratiques / suggestions
Ajouter un README dans chaque dossier (bank/, service/) avec les détails propres au service.
Ajouter Dockerfile par service pour pouvoir conteneuriser les services et lancer tout le stack via docker-compose multi-service.
Fournir un .env.example à la racine et un script d'initialisation si nécessaire.
Exposer des endpoints health et readiness (Actuator) si non présents.
Contribution
Ouvrez une issue pour signaler un bug ou demander une fonctionnalité.
Pour poster une PR : documentez les changements, mettez à jour les README locaux (bank/README.md, service/README.md) si vous modifiez des comportements.
Exemple commit pour ce README :
bash
git add README.md
git commit -m "docs: ajout README complet en français"
git push origin <votre-branche>
Licence
Aucun fichier LICENSE détecté à la racine — ajoutez-en un si vous souhaitez partager sous une licence précise (MIT, Apache-2.0, ...).
Si vous voulez que je commette directement ce README.md dans la branche main du dépôt, dites-le moi et je peux l'ajouter avec un message de commit (ou je peux créer une branche et ouvrir une PR selon votre préférence).


Markdown
# MICROSERVICE-APP-MOBILE

Projet microservices + application mobile (wallet) — backend en Java / Spring Boot (plusieurs services) et client Flutter. Ce README explique en français comment configurer, lancer et tester l'ensemble en local.

## Aperçu
- Backend bank : Java Spring Boot (package racine `sn.l3gl.banque.api`), service principal sur le port `8081`.
- Backend service (prestation/paiement) : Java Spring Boot (package `com.service.service`), service sur le port `8082`.
- Client mobile : Flutter (dossier `wallet_app`).
- Bases de données : PostgreSQL définies dans `docker-compose.yml` (racine) et `bank/docker/docker-compose.yml`.

## Arborescence importante
bank/ # microservice banque (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd src/main/java/sn/l3gl/banque/... src/main/resources/application.yaml docker/docker-compose.yml

service/ # service prestation/paiement (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd .env.example src/main/resources/application.yaml

wallet_app/ # application Flutter pubspec.yaml README.md (Flutter)

docker-compose.yml # compose racine : lève les DB PostgreSQL

Code

---

## Prérequis
- Docker & Docker Compose
- JDK compatible (vérifier `java.version` dans les `pom.xml`; JDK 17+ recommandé)
- Git
- Flutter SDK (si vous lancez `wallet_app`)
- (Optionnel) `psql` si vous voulez interroger les bases depuis l'hôte

---

## Valeurs de configuration observées (par défaut)
### Bases de données (root docker-compose)
- postgres_banque
  - container: `db_banque`
  - port hôte -> container : `5434:5432`
  - DB: `banque_221`
  - USER: `banque_user`
  - PASS: `banque_password`
- postgres_prestation
  - container: `db_prestation`
  - port hôte -> container : `5435:5432`
  - DB: `prestation_221`
  - USER: `prestation_user`
  - PASS: `prestation_password`

### Service bank (bank/src/main/resources/application.yaml)
- Port service : `8081`
- JDBC : `jdbc:postgresql://localhost:5434/banque_221`
- Utilisateurs par défaut (pour tests) :
  - `admin` / `admin123` (ROLE: ADMIN)
  - `user1` / `user123` (ROLE: USER)
  - `agent1` / `agent123` (ROLE: AGENT)
- JWT secret et expiration configurés dans `application.yaml`.

### Service (service/src/main/resources/application.yaml)
- Port service : `8082`
- JDBC : `jdbc:postgresql://localhost:5435/prestation_221`
- Le service lit des variables d'environnement (via Dotenv). Exemple `service/.env.example` :
PAYMENT_BASE_URL=http://localhost:8081 PAYMENT_AUTH_USERNAME= PAYMENT_AUTH_PASSWORD= PAYMENT_LOGIN_PATH=/api/auth/login PAYMENT_INIT_PATH=/api/paiements/prestation

Code

---

## Lancer l'environnement local (pas à pas)

1) Cloner le dépôt
```bash
git clone https://github.com/Fadloulahi14/MICROSERVICE-APP-MOBILE.git
cd MICROSERVICE-APP-MOBILE
Démarrer les bases PostgreSQL (racine)
bash
docker compose up -d
Vérifier les containers :
bash
docker compose ps
Lancer le microservice bank
bash
cd bank
# construire
./mvnw clean package

# lancer le JAR (après build)
java -jar target/*.jar

# ou en dev (hot reload limitée)
./mvnw spring-boot:run
Swagger UI (si actif) : http://localhost:8081/swagger-ui
API docs : http://localhost:8081/api-docs ou /v3/api-docs selon config
Lancer le service (prestation/paiement)
bash
cd service
# copier .env exemple et l'adapter si besoin
cp .env.example .env
# (éditer .env si nécessaire : PAYMENT_*)

# construire
./mvnw clean package

# lancer
java -jar target/*.jar
# ou
./mvnw spring-boot:run
Swagger UI : http://localhost:8082/swagger-ui
Vérifiez que PAYMENT_BASE_URL dans .env pointe vers le bank (ex: http://localhost:8081) si ce service doit appeler le service bank.
Lancer l'application Flutter (wallet_app)
bash
cd wallet_app
flutter pub get

# lancer sur émulateur / appareil
flutter run

# pour exécuter avec une API différente
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
Remarques :

Sur Android Emulator, 10.0.2.2 référence l'hôte (utilisez plutôt localhost sur iOS Simulator).
Adaptez la config réseau du client si nécessaire (rechercher où l'URL API est définie dans le code Flutter).
Commandes utiles et dépannage
Voir logs compose :
bash
docker compose logs -f
Supprimer volumes DB (réinitialiser données) :
bash
docker compose down -v
docker compose up -d
Se connecter à PostgreSQL (depuis hôte si psql installé) :
bash
psql -h localhost -p 5434 -U banque_user -d banque_221
# ou pour prestation
psql -h localhost -p 5435 -U prestation_user -d prestation_221
Si les ports sont occupés : modifier les mappings dans docker-compose.yml ou arrêter les services qui occupent ces ports.

Erreurs de compilation liées à Lombok : activer l'annotation processing dans votre IDE (IntelliJ / Eclipse) et installer le plugin Lombok si besoin.

Tests rapides (vérifications post-démarrage)
Bank up : curl health / swagger
bash
curl -I http://localhost:8081/actuator/health  # si actuator activé
# ou accéder à swagger UI: http://localhost:8081/swagger-ui
Service up :
bash
curl -I http://localhost:8082/actuator/health
Tester endpoint de paiement (exemples) : consultez les routes exposées par /api via Swagger.
Bonnes pratiques / suggestions
Ajouter un README dans chaque dossier (bank/, service/) avec les détails propres au service.
Ajouter Dockerfile par service pour pouvoir conteneuriser les services et lancer tout le stack via docker-compose multi-service.
Fournir un .env.example à la racine et un script d'initialisation si nécessaire.
Exposer des endpoints health et readiness (Actuator) si non présents.
Contribution
Ouvrez une issue pour signaler un bug ou demander une fonctionnalité.
Pour poster une PR : documentez les changements, mettez à jour les README locaux (bank/README.md, service/README.md) si vous modifiez des comportements.
Exemple commit pour ce README :
bash
git add README.md
git commit -m "docs: ajout README complet en français"
git push origin <votre-branche>
Licence
Aucun fichier LICENSE détecté à la racine — ajoutez-en un si vous souhaitez partager sous une licence précise (MIT, Apache-2.0, ...).
Si vous voulez que je commette directement ce README.md dans la branche main du dépôt, dites-le moi et je peux l'ajouter avec un message de commit (ou je peux créer une branche et ouvrir une PR selon votre préférence).

Code

Et voici la commande pour le faire localement dans le dépôt :
```bash
cat > README.md <<'EOF'
# MICROSERVICE-APP-MOBILE

Projet microservices + application mobile (wallet) — backend en Java / Spring Boot (plusieurs services) et client Flutter. Ce README explique en français comment configurer, lancer et tester l'ensemble en local.

## Aperçu
- Backend bank : Java Spring Boot (package racine `sn.l3gl.banque.api`), service principal sur le port `8081`.
- Backend service (prestation/paiement) : Java Spring Boot (package `com.service.service`), service sur le port `8082`.
- Client mobile : Flutter (dossier `wallet_app`).
- Bases de données : PostgreSQL définies dans `docker-compose.yml` (racine) et `bank/docker/docker-compose.yml`.

## Arborescence importante
bank/ # microservice banque (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd src/main/java/sn/l3gl/banque/... src/main/resources/application.yaml docker/docker-compose.yml

service/ # service prestation/paiement (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd .env.example src/main/resources/application.yaml

wallet_app/ # application Flutter pubspec.yaml README.md (Flutter)

docker-compose.yml # compose racine : lève les DB PostgreSQL

Code

---

## Prérequis
- Docker & Docker Compose
- JDK compatible (vérifier `java.version` dans les `pom.xml`; JDK 17+ recommandé)
- Git
- Flutter SDK (si vous lancez `wallet_app`)
- (Optionnel) `psql` si vous voulez interroger les bases depuis l'hôte

---

## Valeurs de configuration observées (par défaut)
### Bases de données (root docker-compose)
- postgres_banque
  - container: `db_banque`
  - port hôte -> container : `5434:5432`
  - DB: `banque_221`
  - USER: `banque_user`
  - PASS: `banque_password`
- postgres_prestation
  - container: `db_prestation`
  - port hôte -> container : `5435:5432`
  - DB: `prestation_221`
  - USER: `prestation_user`
  - PASS: `prestation_password`

### Service bank (bank/src/main/resources/application.yaml)
- Port service : `8081`
- JDBC : `jdbc:postgresql://localhost:5434/banque_221`
- Utilisateurs par défaut (pour tests) :
  - `admin` / `admin123` (ROLE: ADMIN)
  - `user1` / `user123` (ROLE: USER)
  - `agent1` / `agent123` (ROLE: AGENT)
- JWT secret et expiration configurés dans `application.yaml`.

### Service (service/src/main/resources/application.yaml)
- Port service : `8082`
- JDBC : `jdbc:postgresql://localhost:5435/prestation_221`
- Le service lit des variables d'environnement (via Dotenv). Exemple `service/.env.example` :
PAYMENT_BASE_URL=http://localhost:8081 PAYMENT_AUTH_USERNAME= PAYMENT_AUTH_PASSWORD= PAYMENT_LOGIN_PATH=/api/auth/login PAYMENT_INIT_PATH=/api/paiements/prestation

Code

---

## Lancer l'environnement local (pas à pas)

1) Cloner le dépôt
```bash
git clone https://github.com/Fadloulahi14/MICROSERVICE-APP-MOBILE.git
cd MICROSERVICE-APP-MOBILE
Démarrer les bases PostgreSQL (racine)
bash
docker compose up -d
Vérifier les containers :
bash
docker compose ps
Lancer le microservice bank
bash
cd bank
# construire
./mvnw clean package

# lancer le JAR (après build)
java -jar target/*.jar

# ou en dev (hot reload limitée)
./mvnw spring-boot:run
Swagger UI (si actif) : http://localhost:8081/swagger-ui
API docs : http://localhost:8081/api-docs ou /v3/api-docs selon config
Lancer le service (prestation/paiement)
bash
cd service
# copier .env exemple et l'adapter si besoin
cp .env.example .env
# (éditer .env si nécessaire : PAYMENT_*)
\n# construire\n./mvnw clean package\n\n# lancer\njava -jar target/*.jar\n# ou\n./mvnw spring-boot:run\n```
- Swagger UI : http://localhost:8082/swagger-ui
- Vérifiez que `PAYMENT_BASE_URL` dans `.env` pointe vers le bank (ex: `http://localhost:8081`) si ce service doit appeler le service bank.

5) Lancer l'application Flutter (wallet_app)
```bash
cd wallet_app
flutter pub get

# lancer sur émulateur / appareil
flutter run

# pour exécuter avec une API différente
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
Remarques :

Sur Android Emulator, 10.0.2.2 référence l'hôte (utilisez plutôt localhost sur iOS Simulator).
Adaptez la config réseau du client si nécessaire (rechercher où l'URL API est définie dans le code Flutter).
Commandes utiles et dépannage
Voir logs compose :
bash
docker compose logs -f
Supprimer volumes DB (réinitialiser données) :
bash
docker compose down -v
docker compose up -d
Se connecter à PostgreSQL (depuis hôte si psql installé) :
bash
psql -h localhost -p 5434 -U banque_user -d banque_221
# ou pour prestation
psql -h localhost -p 5435 -U prestation_user -d prestation_221
Si les ports sont occupés : modifier les mappings dans docker-compose.yml ou arrêter les services qui occupent ces ports.

Erreurs de compilation liées à Lombok : activer l'annotation processing dans votre IDE (IntelliJ / Eclipse) et installer le plugin Lombok si besoin.

Tests rapides (vérifications post-démarrage)
Bank up : curl health / swagger
bash
curl -I http://localhost:8081/actuator/health  # si actuator activé
# ou accéder à swagger UI: http://localhost:8081/swagger-ui
Service up :
bash
curl -I http://localhost:8082/actuator/health
Tester endpoint de paiement (exemples) : consultez les routes exposées par /api via Swagger.
Bonnes pratiques / suggestions
Ajouter un README dans chaque dossier (bank/, service/) avec les détails propres au service.
Ajouter Dockerfile par service pour pouvoir conteneuriser les services et lancer tout le stack via docker-compose multi-service.
Fournir un .env.example à la racine et un script d'initialisation si nécessaire.
Exposer des endpoints health et readiness (Actuator) si non présents.
Contribution
Ouvrez une issue pour signaler un bug ou demander une fonctionnalité.
Pour poster une PR : documentez les changements, mettez à jour les README locaux (bank/README.md, service/README.md) si vous modifiez des comportements.
Exemple commit pour ce README :
bash
git add README.md
git commit -m "docs: ajout README complet en français"
git push origin <votre-branche>
Licence
Aucun fichier LICENSE détecté à la racine — ajoutez-en un si vous souhaitez partager sous une licence précise (MIT, Apache-2.0, ...).
Si vous voulez que je commette directement ce README.md dans la branche main du dépôt, dites-le moi et je peux l'ajouter avec un message de commit (ou je peux créer une branche et ouvrir une PR selon votre préférence). EOF

git add README.md git commit -m "docs: add README in French" git push origin HEAD

Code

Je peux aussi vous proposer une version “plus propre” avec un README plus court et plus professionnel si vous le souhaitez.
je veux le readme complet prêt à mettre dans mon fichier readme 
Voici le README complet en français, prêt à copier-coller dans votre fichier README.md :

Markdown
# MICROSERVICE-APP-MOBILE

Projet microservices + application mobile (wallet). Backend en Java / Spring Boot (plusieurs services) et client Flutter. Ce README explique en français comment configurer, lancer et tester l'ensemble en local.

---

## Aperçu rapide
- bank : microservice Java Spring Boot (package racine `sn.l3gl.banque.api`) — sert de service bancaire (port par défaut : 8081).
- service : microservice Java Spring Boot (package `com.service.service`) — prestation / paiement (port par défaut : 8082).
- wallet_app : application mobile Flutter.
- Bases de données : PostgreSQL (containers définis dans `docker-compose.yml` à la racine et `bank/docker/docker-compose.yml`).

---

## Stack
- Langage backend : Java (Maven), Spring Boot (version observée dans `pom.xml`).
- Client mobile : Flutter.
- DB : PostgreSQL (images officielles dans docker-compose).
- Outils : Docker / Docker Compose, Maven wrapper (`mvnw`) inclus dans chaque service.

---

## Arborescence principale
bank/ # microservice banque (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd src/main/java/... src/main/resources/application.yaml docker/docker-compose.yml

service/ # microservice prestation/paiement (Maven, Spring Boot) pom.xml mvnw, mvnw.cmd .env.example src/main/resources/application.yaml

wallet_app/ # application Flutter pubspec.yaml README.md

docker-compose.yml # compose racine : lève les DB PostgreSQL build/ # éventuels artefacts CI/build

Code

---

## Prérequis
- Docker & Docker Compose installés
- JDK (version compatible, vérifier `java.version` dans les `pom.xml`; JDK 17+ recommandé)
- Git
- Flutter SDK (si vous lancez l'app mobile)
- (Optionnel) `psql` pour interroger les bases depuis l'hôte

---

## Valeurs de configuration observées (par défaut)

### docker-compose (racine)
Le fichier lève deux bases PostgreSQL :
- postgres_banque
  - container: `db_banque`
  - port hôte -> container : `5434:5432`
  - BD: `banque_221`
  - USER: `banque_user`
  - PASS: `banque_password`
- postgres_prestation
  - container: `db_prestation`
  - port hôte -> container : `5435:5432`
  - BD: `prestation_221`
  - USER: `prestation_user`
  - PASS: `prestation_password`

### bank (bank/src/main/resources/application.yaml)
- Port service : `8081`
- JDBC : `jdbc:postgresql://localhost:5434/banque_221`
- Utilisateurs de test (définis dans le fichier) :
  - `admin` / `admin123` (ROLE: ADMIN)
  - `user1` / `user123` (ROLE: USER)
  - `agent1` / `agent123` (ROLE: AGENT)
- JWT secret et expiration définis dans `application.yaml`
- Swagger / OpenAPI : `/swagger-ui`, `/api-docs` (ou `/v3/api-docs`)

### service (service/src/main/resources/application.yaml)
- Port service : `8082`
- JDBC : `jdbc:postgresql://localhost:5435/prestation_221`
- Lecture de variables d'environnement via Dotenv ; exemple fourni : `service/.env.example`
PAYMENT_BASE_URL=http://localhost:8081 PAYMENT_AUTH_USERNAME= PAYMENT_AUTH_PASSWORD= PAYMENT_LOGIN_PATH=/api/auth/login PAYMENT_INIT_PATH=/api/paiements/prestation

Code

---

## Lancer l'environnement local (pas à pas)

1) Cloner le dépôt
```bash
git clone https://github.com/Fadloulahi14/MICROSERVICE-APP-MOBILE.git
cd MICROSERVICE-APP-MOBILE
Démarrer les bases PostgreSQL (depuis la racine)
bash
docker compose up -d
Vérifier les containers :
bash
docker compose ps
Lancer le microservice bank
bash
cd bank
# construire
./mvnw clean package

# exécuter le jar produit
java -jar target/*.jar

# ou en dev
./mvnw spring-boot:run
Accès Swagger UI : http://localhost:8081/swagger-ui
API docs : http://localhost:8081/api-docs (ou /v3/api-docs selon config)
Lancer le microservice service
bash
cd service
# copier et adapter l'exemple d'env
cp .env.example .env
# modifier .env si besoin (PAYMENT_BASE_URL, USER, PASS...)

# construire
./mvnw clean package

# exécuter
java -jar target/*.jar

# ou en dev
./mvnw spring-boot:run
Accès Swagger UI : http://localhost:8082/swagger-ui
Remarque : assurez-vous que PAYMENT_BASE_URL (dans .env) pointe vers bank si le service doit l'appeler (ex: http://localhost:8081).

Lancer l'application Flutter (wallet_app)
bash
cd wallet_app
flutter pub get

# lancer sur émulateur / appareil connecté
flutter run

# exemple avec base API spécifique (émulateur Android)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
Note : sur Android emulator 10.0.2.2 pointe vers l'hôte. Sur iOS simulator, localhost est utilisable.
Commandes utiles & maintenance
Voir logs compose :
bash
docker compose logs -f
Redémarrer et supprimer volumes (réinitialiser données) :
bash
docker compose down -v
docker compose up -d
Connexion psql depuis l'hôte :
bash
psql -h localhost -p 5434 -U banque_user -d banque_221
# pour prestation :
psql -h localhost -p 5435 -U prestation_user -d prestation_221
Voir logs d'un service Java (console où vous lancez java -jar) ou via Docker logs si vous conteneurisez le service.

Si erreur liée à Lombok à la compilation : activer l'annotation processing dans votre IDE (IntelliJ/Eclipse) et installer plugin Lombok.

Vérifications rapides après démarrage
Vérifier que bank est accessible :
bash
curl -I http://localhost:8081/  # ou /swagger-ui
Vérifier que service est accessible :
bash
curl -I http://localhost:8082/
Tester un endpoint via Swagger UI pour connaître les routes exactes exposées.
Bonnes pratiques & améliorations recommandées
Ajouter un README spécifique dans bank/ et service/ avec détails de build, variables d'env et endpoints.
Ajouter un Dockerfile par service et un docker-compose combiné pour démarrer tout le système conteneurisé (DB + services).
Centraliser les variables d'environnement dans un .env.example à la racine.
Ajouter des endpoints health/readiness (Spring Actuator) si non déjà présents.
Ajouter un fichier LICENSE si vous partagez publiquement.
Contribution
Ouvrez une issue pour bugs/demandes.
Faites une branche pour vos modifications, ajoutez tests si possible et ouvrez une PR.
Exemple de workflow local :
bash
git checkout -b feat/docs-readme-fr
git add README.md
git commit -m "docs: ajout README complet en français"
git push origin feat/docs-readme-fr
# puis ouvrez une PR sur GitHub

Workflow de test complet — application web Nikitin
---------------------------------------------------

L'application web est disponible à l'adresse http://127.0.0.1:5173. Démarrez au préalable les microservices banque (port 8081) et prestations (port 8082) ainsi que le serveur web. Les instructions de démarrage du client figurent dans [web/README.md](web/README.md). Les API peuvent être consultées dans Swagger :

- Banque : http://127.0.0.1:8081/swagger-ui
- Prestations : http://127.0.0.1:8082/swagger-ui

1. Se connecter

Choisissez « Client 1 » sur l'écran de connexion ou utilisez :

- Téléphone : `+221771000001`
- Code PIN : `1234`

Le compte « Client 2 » est également disponible avec le téléphone `+221771000002` et le même code PIN. Le solde initial de chaque compte de démonstration est de 10 000 000 FCFA.

2. Tester les opérations du portefeuille

Depuis « Vue d’ensemble » :

- Déposez 1 000 FCFA sans code PIN. Le solde de Client 1 doit passer à 10 001 000 FCFA.
- Retirez 500 FCFA avec le PIN `1234`. Le solde doit passer à 10 000 500 FCFA.
- Vérifiez que les opérations apparaissent dans « Activité récente » et « Mes dépenses ».
- Facultatif : essayez un retrait avec un PIN incorrect ; la transaction doit échouer et le solde ne doit pas changer.

3. Commander une prestation et la payer ensuite

Ouvrez « Services », puis « Nouvelle demande » :

- Sélectionnez au moins un service du catalogue.
- Indiquez une description, une période et un montant entier, par exemple 1 000 FCFA.
- Laissez le code PIN vide et envoyez la demande.
- Vérifiez que la demande apparaît dans « Mes demandes » avec le statut « À payer ».
- Cliquez sur « Régler maintenant » et saisissez `1234`.
- Vérifiez que le statut passe à « Payée » et que le solde diminue du montant de la prestation.

4. Commander une prestation avec paiement immédiat

Créez une autre demande avec au moins un service, un montant entier et le PIN `1234`. Si le paiement réussit, la demande doit apparaître comme payée et le solde doit être débité une seule fois. Vous pouvez aussi utiliser un PIN incorrect pour vérifier que l'erreur est affichée et que le paiement n'est pas validé.

5. Tester l'inscription

Déconnectez-vous, puis choisissez « Créer un compte » :

- Saisissez un numéro de téléphone qui n'est pas déjà utilisé et demandez un code OTP.
- Pour cet environnement de démonstration, le code OTP est simulé et affiché dans le formulaire.
- Complétez les informations d'identité et choisissez un PIN de 4 à 6 chiffres.
- Renseignez un dépôt initial d'au moins 10 000 FCFA et créez le compte.
- Vérifiez la connexion automatique et le solde du nouveau compte.

Les microservices de cet environnement de test utilisent H2 en mémoire, sans PostgreSQL : comptes créés, transactions et prestations disparaissent au redémarrage des services. Les demandes et le catalogue de services sont stockés dans la mémoire du service de prestations. L'historique bancaire est limité à la session affichée dans le navigateur, car l'API ne fournit pas de route pour lire l'ensemble des transactions. Ces comptes et ces PIN sont réservés à la démonstration locale ; ne les réutilisez pas en production.