-- ============================================================
-- SHUSTOBD MYSQL DATABASE SCHEMA
-- Compatible with MySQL 5.7, 8.0+ and MariaDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS `shustobd` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shustobd`;

-- 1. Users & Profiles Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(128) NOT NULL,
  `phone` VARCHAR(32) NOT NULL UNIQUE,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(128) DEFAULT NULL,
  `role` ENUM('user', 'doctor', 'hospital', 'pharmacy', 'ambulance', 'lab', 'physio', 'investor', 'manager', 'admin', 'state') NOT NULL DEFAULT 'user',
  `wallet_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS `doctors` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) DEFAULT NULL,
  `name` VARCHAR(128) NOT NULL,
  `specialty` VARCHAR(128) NOT NULL,
  `fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `chamber` VARCHAR(255) DEFAULT NULL,
  `experience` VARCHAR(64) DEFAULT NULL,
  `availability` VARCHAR(128) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_doctors_specialty` (`specialty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(128) NOT NULL,
  `patient_id` VARCHAR(128) NOT NULL,
  `patient_name` VARCHAR(128) NOT NULL,
  `patient_phone` VARCHAR(32) DEFAULT NULL,
  `doctor_id` VARCHAR(128) NOT NULL,
  `doctor_name` VARCHAR(128) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `time_slot` VARCHAR(64) DEFAULT NULL,
  `fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `symptoms` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_appointments_patient` (`patient_id`),
  INDEX `idx_appointments_doctor` (`doctor_id`),
  INDEX `idx_appointments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Transactions & Wallet Ledger Table
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `type` ENUM('deposit', 'withdraw', 'payment', 'commission', 'earning') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `method` VARCHAR(64) DEFAULT NULL, -- bkash, nagad, rocket, card
  `trx_id` VARCHAR(128) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tx_user` (`user_id`),
  INDEX `idx_tx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Prescriptions Table
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` VARCHAR(128) NOT NULL,
  `appointment_id` VARCHAR(128) DEFAULT NULL,
  `patient_id` VARCHAR(128) NOT NULL,
  `doctor_id` VARCHAR(128) NOT NULL,
  `diagnosis` TEXT DEFAULT NULL,
  `medicines` JSON DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_rx_patient` (`patient_id`),
  INDEX `idx_rx_doctor` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
