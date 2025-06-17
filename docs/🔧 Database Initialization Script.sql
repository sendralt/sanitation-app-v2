🔧 Database Initialization Script

⏳ Testing database connection...
Executing (default): SELECT 1+1 AS result
✅ Database connection established successfully
⏳ Creating/updating Users table...
Executing (default): SELECT name FROM sqlite_master WHERE type='table' AND name='Users';  
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT 0, `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT 0, `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));  
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA TABLE_INFO(`Users`);
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
Executing (default): PRAGMA foreign_key_list(`Users`)
Executing (default): CREATE TABLE IF NOT EXISTS `Users_backup` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users_backup` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users`;
Executing (default): DROP TABLE `Users`;
Executing (default): CREATE TABLE IF NOT EXISTS `Users` (`id` UUID NOT NULL UNIQUE PRIMARY KEY, `username` VARCHAR(255) NOT NULL UNIQUE, `firstName` VARCHAR(255) NOT NULL, `lastName` VARCHAR(255) NOT NULL, `passwordHash` VARCHAR(255) NOT NULL, `securityQuestion1Id` INTEGER NOT NULL, `securityAnswer1Hash` VARCHAR(255) NOT NULL, `securityQuestion2Id` INTEGER NOT NULL, `securityAnswer2Hash` VARCHAR(255) NOT NULL, `passwordResetAttemptCount` INTEGER NOT NULL DEFAULT '0', `lastPasswordResetAttempt` DATETIME, `isAdmin` TINYINT(1) NOT NULL DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `role` TEXT NOT NULL DEFAULT 'user', `managerId` UUID REFERENCES `Users` (`id`), `department` VARCHAR(255));
Executing (default): INSERT INTO `Users` SELECT `id`, `username`, `firstName`, `lastName`, `passwordHash`, `securityQuestion1Id`, `securityAnswer1Hash`, `securityQuestion2Id`, `securityAnswer2Hash`, `passwordResetAttemptCount`, `lastPasswordResetAttempt`, `isAdmin`, `createdAt`, `updatedAt`, `role`, `managerId`, `department` FROM `Users_backup`;
Executing (default): DROP TABLE `Users_backup`;
Executing (default): PRAGMA INDEX_LIST(`Users`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_1`)
Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_Users_2`)
✅ Users table synchronized successfully
Executing (default): SELECT count(*) AS `count` FROM `Users` AS `User`;
📊 Current user count: 1
ℹ️  Users already exist, skipping admin user creation
⏳ Checking for role column...
Executing (default): SELECT role FROM Users LIMIT 1
✅ Role column already exists
Executing (default): SELECT count(*) AS `count` FROM `Users` AS `User` WHERE `User`.`role` = 'manager';
⏳ Creating test manager user...
💥 Database initialization failed: ValidationError [SequelizeValidationError]: notNull Violation: User.passwordHash cannot be null,
notNull Violation: User.securityQuestion1Id cannot be null,
notNull Violation: User.securityAnswer1Hash cannot be null,
notNull Violation: User.securityQuestion2Id cannot be null,
notNull Violation: User.securityAnswer2Hash cannot be null
    at InstanceValidator._validate (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:50:13)
    at async InstanceValidator._validateAndRunHooks (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:60:7)      
    at async InstanceValidator.validate (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:54:12)
    at async User.save (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\model.js:2426:7)
    at async User.create (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\model.js:1362:12)
    at async initializeDatabase (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\initialize-database.js:82:33) {
  errors: [
    ValidationErrorItem {
      message: 'User.passwordHash cannot be null',
      type: 'notNull Violation',
      path: 'passwordHash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityQuestion1Id cannot be null',
      type: 'notNull Violation',
      path: 'securityQuestion1Id',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityAnswer1Hash cannot be null',
      type: 'notNull Violation',
      path: 'securityAnswer1Hash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityQuestion2Id cannot be null',
      type: 'notNull Violation',
      path: 'securityQuestion2Id',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityAnswer2Hash cannot be null',
      type: 'notNull Violation',
      path: 'securityAnswer2Hash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    }
  ]
}

🔌 Database connection closed
💥 Unhandled error: ValidationError [SequelizeValidationError]: notNull Violation: User.passwordHash cannot be null,
notNull Violation: User.securityQuestion1Id cannot be null,
notNull Violation: User.securityAnswer1Hash cannot be null,
notNull Violation: User.securityQuestion2Id cannot be null,
notNull Violation: User.securityAnswer2Hash cannot be null
    at InstanceValidator._validate (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:50:13)
    at async InstanceValidator._validateAndRunHooks (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:60:7)      
    at async InstanceValidator.validate (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\instance-validator.js:54:12)
    at async User.save (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\model.js:2426:7)
    at async User.create (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\node_modules\sequelize\lib\model.js:1362:12)
    at async initializeDatabase (C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login\initialize-database.js:82:33) {
  errors: [
    ValidationErrorItem {
      message: 'User.passwordHash cannot be null',
      type: 'notNull Violation',
      path: 'passwordHash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityQuestion1Id cannot be null',
      type: 'notNull Violation',
      path: 'securityQuestion1Id',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityAnswer1Hash cannot be null',
      type: 'notNull Violation',
      path: 'securityAnswer1Hash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityQuestion2Id cannot be null',
      type: 'notNull Violation',
      path: 'securityQuestion2Id',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    },
    ValidationErrorItem {
      message: 'User.securityAnswer2Hash cannot be null',
      type: 'notNull Violation',
      path: 'securityAnswer2Hash',
      value: null,
      origin: 'CORE',
      instance: [User],
      validatorKey: 'is_null',
      validatorName: null,
      validatorArgs: []
    }
  ]
}
PS C:\sanitation-app-ubuntuv1_0\sanitation-app-ubuntuv1_0-1\dhl_login> 