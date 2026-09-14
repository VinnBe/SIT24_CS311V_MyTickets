-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: MyTicket
-- ------------------------------------------------------
-- Server version	26.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'c484f5fa-aa66-11f1-86b4-c03532087873:1-126';

--
-- Table structure for table `CUSTOMER`
--

DROP TABLE IF EXISTS `CUSTOMER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CUSTOMER` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uq_customer_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CUSTOMER`
--

LOCK TABLES `CUSTOMER` WRITE;
/*!40000 ALTER TABLE `CUSTOMER` DISABLE KEYS */;
INSERT INTO `CUSTOMER` VALUES (1,'Nguyen Van A','vana@gmail.com','0901111111'),(2,'Tran Thi B','thib@gmail.com','0902222222'),(3,'Le Van C','vanc@gmail.com','0903333333');
/*!40000 ALTER TABLE `CUSTOMER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EVENT`
--

DROP TABLE IF EXISTS `EVENT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EVENT` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `event_name` varchar(100) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` varchar(50) NOT NULL,
  `venue_id` int NOT NULL,
  PRIMARY KEY (`event_id`),
  KEY `venue_id` (`venue_id`),
  CONSTRAINT `EVENT_ibfk_1` FOREIGN KEY (`venue_id`) REFERENCES `VENUE` (`venue_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_event_status` CHECK ((`status` in (_utf8mb4'upcoming',_utf8mb4'ongoing',_utf8mb4'finished',_utf8mb4'cancelled'))),
  CONSTRAINT `chk_event_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EVENT`
--

LOCK TABLES `EVENT` WRITE;
/*!40000 ALTER TABLE `EVENT` DISABLE KEYS */;
INSERT INTO `EVENT` VALUES (1,'Song Ca Mua Ha','2026-12-20 19:00:00','2026-12-20 22:00:00','upcoming',1),(2,'Acoustic Night','2026-11-15 20:00:00','2026-11-15 22:30:00','upcoming',2);
/*!40000 ALTER TABLE `EVENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ORDERS`
--

DROP TABLE IF EXISTS `ORDERS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ORDERS` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `order_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_date` datetime DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `customer_id` int NOT NULL,
  PRIMARY KEY (`order_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `ORDERS_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `CUSTOMER` (`customer_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_order_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_order_status` CHECK ((`status` in (_utf8mb4'pending',_utf8mb4'paid',_utf8mb4'failed'))),
  CONSTRAINT `chk_order_total` CHECK ((`total_amount` = (`quantity` * `unit_price`)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ORDERS`
--

LOCK TABLES `ORDERS` WRITE;
/*!40000 ALTER TABLE `ORDERS` DISABLE KEYS */;
INSERT INTO `ORDERS` VALUES (1,'2026-09-10 10:00:00',2,1500000.00,3000000.00,'Momo','2026-09-10 10:05:00','paid',1),(2,'2026-09-14 09:00:00',1,500000.00,500000.00,'VNPay',NULL,'pending',2),(3,'2026-09-13 15:00:00',1,1000000.00,1000000.00,'Card',NULL,'failed',3);
/*!40000 ALTER TABLE `ORDERS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SEAT`
--

DROP TABLE IF EXISTS `SEAT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SEAT` (
  `seat_id` int NOT NULL AUTO_INCREMENT,
  `seat_number` varchar(20) NOT NULL,
  `zone` varchar(50) NOT NULL,
  `venue_id` int NOT NULL,
  PRIMARY KEY (`seat_id`),
  UNIQUE KEY `uq_seat_venue_number` (`venue_id`,`seat_number`),
  KEY `venue_id` (`venue_id`),
  CONSTRAINT `SEAT_ibfk_1` FOREIGN KEY (`venue_id`) REFERENCES `VENUE` (`venue_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SEAT`
--

LOCK TABLES `SEAT` WRITE;
/*!40000 ALTER TABLE `SEAT` DISABLE KEYS */;
INSERT INTO `SEAT` VALUES (1,'A1','VIP',1),(2,'A2','VIP',1),(3,'B1','Standard',1),(4,'B2','Standard',1),(5,'A1','VIP',2),(6,'B1','Standard',2);
/*!40000 ALTER TABLE `SEAT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TICKET`
--

DROP TABLE IF EXISTS `TICKET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TICKET` (
  `ticket_id` int NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL,
  `seat_id` int NOT NULL,
  `ticket_type_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `uq_ticket_qr` (`qr_code`),
  KEY `seat_id` (`seat_id`),
  KEY `ticket_type_id` (`ticket_type_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `TICKET_ibfk_1` FOREIGN KEY (`seat_id`) REFERENCES `SEAT` (`seat_id`) ON DELETE RESTRICT,
  CONSTRAINT `TICKET_ibfk_2` FOREIGN KEY (`ticket_type_id`) REFERENCES `TICKET_TYPE` (`ticket_type_id`) ON DELETE RESTRICT,
  CONSTRAINT `TICKET_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `ORDERS` (`order_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_ticket_status` CHECK ((`status` in (_utf8mb4'not_used',_utf8mb4'used',_utf8mb4'cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TICKET`
--

LOCK TABLES `TICKET` WRITE;
/*!40000 ALTER TABLE `TICKET` DISABLE KEYS */;
/*!40000 ALTER TABLE `TICKET` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TICKET_TYPE`
--

DROP TABLE IF EXISTS `TICKET_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TICKET_TYPE` (
  `ticket_type_id` int NOT NULL AUTO_INCREMENT,
  `ticket_type_name` varchar(100) NOT NULL,
  `ticket_price` decimal(10,2) NOT NULL,
  `available_tickets` int NOT NULL,
  `number_of_tickets` int NOT NULL,
  `event_id` int NOT NULL,
  PRIMARY KEY (`ticket_type_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `TICKET_TYPE_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `EVENT` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_tickettype_available` CHECK ((`available_tickets` between 0 and `number_of_tickets`)),
  CONSTRAINT `chk_tickettype_price` CHECK ((`ticket_price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TICKET_TYPE`
--

LOCK TABLES `TICKET_TYPE` WRITE;
/*!40000 ALTER TABLE `TICKET_TYPE` DISABLE KEYS */;
INSERT INTO `TICKET_TYPE` VALUES (1,'VIP',1500000.00,2,2,1),(2,'Standard',500000.00,2,2,1),(3,'VIP',1000000.00,1,1,2),(4,'Standard',300000.00,1,1,2);
/*!40000 ALTER TABLE `TICKET_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VENUE`
--

DROP TABLE IF EXISTS `VENUE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VENUE` (
  `venue_id` int NOT NULL AUTO_INCREMENT,
  `venue_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `capacity` int NOT NULL,
  PRIMARY KEY (`venue_id`),
  CONSTRAINT `chk_venue_capacity` CHECK ((`capacity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VENUE`
--

LOCK TABLES `VENUE` WRITE;
/*!40000 ALTER TABLE `VENUE` DISABLE KEYS */;
INSERT INTO `VENUE` VALUES (1,'SECC Hall A','799 Nguyen Van Linh, Q7, TP.HCM',5000),(2,'Hoa Binh Theatre','240 3 Thang 2, Q10, TP.HCM',1200);
/*!40000 ALTER TABLE `VENUE` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-14 10:54:49
