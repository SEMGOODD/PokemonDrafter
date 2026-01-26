FROM gradle:7.6-jdk21-alpine AS builder
WORKDIR /app

# on copie d'abord les fichiers de configuration
COPY build.gradle settings.gradle gradlew ./
COPY gradle ./gradle

RUN ./gradlew dependencies --no-daemon || true

COPY . .

RUN ./gradlew clean bootJar -x test --no-daemon

# Image d'exécution (Runtime)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

EXPOSE 8080

# On utilise un pattern pour ne prendre que le JAR exécutable (pas le -plain.jar)
COPY --from=builder /app/build/libs/*SNAPSHOT.jar app.jar

# On utilise le nom de fichier fixe défini au-dessus
ENTRYPOINT ["java", "-jar", "app.jar"]