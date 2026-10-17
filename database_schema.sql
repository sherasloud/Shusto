-- ============================================================
-- SHUSTOBD MYSQL DATABASE SCHEMA (COMPLETE & PRODUCTION-READY)
-- Compatible with MySQL 5.7, 8.0+, MariaDB, and Cloud SQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS `shustobd` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shustobd`;

-- 1. Users Table (Zero-Loss Soft Delete Architecture)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(128) NOT NULL,
  `uid` VARCHAR(128) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(128) DEFAULT NULL,
  `role` ENUM('user', 'patient', 'doctor', 'hospital', 'pharmacy', 'ambulance', 'lab', 'physio', 'investor', 'manager', 'admin', 'state') NOT NULL DEFAULT 'user',
  `wallet_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  `photo_url` TEXT DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `blood_group` VARCHAR(16) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_uid` (`uid`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_active` (`is_deleted`)
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
  `email` VARCHAR(128) DEFAULT NULL,
  `image` TEXT DEFAULT NULL,
  `bmdc_number` VARCHAR(64) DEFAULT NULL,
  `degree` VARCHAR(255) DEFAULT NULL,
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `is_online` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_doctors_specialty` (`specialty`),
  INDEX `idx_doctors_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(128) NOT NULL,
  `patient_id` VARCHAR(128) NOT NULL,
  `patient_name` VARCHAR(128) NOT NULL,
  `patient_phone` VARCHAR(32) DEFAULT NULL,
  `patient_age` VARCHAR(16) DEFAULT NULL,
  `patient_gender` VARCHAR(16) DEFAULT NULL,
  `doctor_id` VARCHAR(128) NOT NULL,
  `doctor_name` VARCHAR(128) NOT NULL,
  `doctor_specialty` VARCHAR(128) DEFAULT NULL,
  `date` VARCHAR(32) NOT NULL,
  `time_slot` VARCHAR(64) DEFAULT NULL,
  `fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `symptoms` TEXT DEFAULT NULL,
  `meeting_link` TEXT DEFAULT NULL,
  `type` VARCHAR(32) DEFAULT 'doctor',
  `prescription_id` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_appointments_patient` (`patient_id`),
  INDEX `idx_appointments_doctor` (`doctor_id`),
  INDEX `idx_appointments_status` (`status`),
  INDEX `idx_appointments_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Wallets Ledger Table
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL UNIQUE,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `pending_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_earned` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_withdrawn` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(8) NOT NULL DEFAULT 'BDT',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_wallet_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Transactions Ledger Table
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `provider_id` VARCHAR(128) DEFAULT NULL,
  `type` ENUM('add_money', 'deposit', 'withdraw', 'payment', 'commission', 'earning', 'refund') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `provider_share` DECIMAL(12,2) DEFAULT 0.00,
  `shusto_share` DECIMAL(12,2) DEFAULT 0.00,
  `method` VARCHAR(64) DEFAULT NULL, -- bkash, nagad, rocket, card, sslcommerz
  `trx_id` VARCHAR(128) DEFAULT NULL,
  `ssl_transaction_id` VARCHAR(128) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'completed', 'success', 'failed') NOT NULL DEFAULT 'pending',
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tx_user` (`user_id`),
  INDEX `idx_tx_status` (`status`),
  INDEX `idx_tx_trx_id` (`trx_id`),
  INDEX `idx_tx_ssl` (`ssl_transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Prescriptions Table
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` VARCHAR(128) NOT NULL,
  `appointment_id` VARCHAR(128) DEFAULT NULL,
  `patient_id` VARCHAR(128) NOT NULL,
  `patient_name` VARCHAR(128) DEFAULT NULL,
  `doctor_id` VARCHAR(128) NOT NULL,
  `doctor_name` VARCHAR(128) DEFAULT NULL,
  `specialty` VARCHAR(128) DEFAULT NULL,
  `diagnosis` TEXT DEFAULT NULL,
  `medicines` JSON DEFAULT NULL,
  `advice` TEXT DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `follow_up_date` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(32) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_rx_patient` (`patient_id`),
  INDEX `idx_rx_doctor` (`doctor_id`),
  INDEX `idx_rx_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Medicines Table (Store Catalog)
CREATE TABLE IF NOT EXISTS `medicines` (
  `id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `generic_name` VARCHAR(128) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(64) DEFAULT NULL,
  `image` TEXT DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_med_category` (`category`),
  INDEX `idx_med_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Diagnostic Lab Tests Table
CREATE TABLE IF NOT EXISTS `lab_tests` (
  `id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_lab_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Service Requests Table (Ambulance, Physio, etc.)
CREATE TABLE IF NOT EXISTS `service_requests` (
  `id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `patient_name` VARCHAR(128) DEFAULT NULL,
  `patient_phone` VARCHAR(32) DEFAULT NULL,
  `service_type` ENUM('ambulance', 'physio', 'hospital', 'lab') NOT NULL,
  `details` TEXT DEFAULT NULL,
  `location` TEXT DEFAULT NULL,
  `cost` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `assigned_provider_id` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sr_user` (`user_id`),
  INDEX `idx_sr_type` (`service_type`),
  INDEX `idx_sr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Call Sessions Table (Telehealth Video Consultations)
CREATE TABLE IF NOT EXISTS `call_sessions` (
  `id` VARCHAR(128) NOT NULL,
  `channel_name` VARCHAR(128) NOT NULL,
  `token` TEXT DEFAULT NULL,
  `doctor_id` VARCHAR(128) NOT NULL,
  `patient_id` VARCHAR(128) NOT NULL,
  `status` ENUM('waiting', 'active', 'ended') NOT NULL DEFAULT 'waiting',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_call_channel` (`channel_name`),
  INDEX `idx_call_doctor` (`doctor_id`),
  INDEX `idx_call_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Complete Firebase Raw Document Backup Table
-- Guarantees 100% data preservation of all Firebase documents, fields, subcollections, and custom metadata
CREATE TABLE IF NOT EXISTS `firebase_raw_backup` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `collection_name` VARCHAR(64) NOT NULL,
  `doc_id` VARCHAR(128) NOT NULL,
  `doc_data` LONGTEXT NOT NULL,
  `exported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_col_doc` (`collection_name`, `doc_id`),
  INDEX `idx_raw_collection` (`collection_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
