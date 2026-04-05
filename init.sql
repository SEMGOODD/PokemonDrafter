-- ============================================================
--  PokemonDrafter – Database Initialization
--  Executed automatically by Postgres on first startup.
-- ============================================================

-- Database for RED team users, teams, and battle history
CREATE DATABASE red_db;

-- Database for BLUE team users, teams, and battle history
CREATE DATABASE blue_db;

-- Database for admin: service logs and chat logs
CREATE DATABASE admin_db;

-- Database for Keycloak identity provider
CREATE DATABASE keycloak_db;
