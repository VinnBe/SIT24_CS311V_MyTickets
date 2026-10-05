-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: MyTickets
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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'c484f5fa-aa66-11f1-86b4-c03532087873:1-194';

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`username`),
  CONSTRAINT `fk_admin_user` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES ('admin1');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `fk_customer_user` FOREIGN KEY (`username`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'an','Nguyễn Văn An','0901111111','an@mail.com'),(2,'binh','Trần Thị Bình','0902222222','binh@mail.com'),(3,'chi','Lê Minh Chi','0903333333','chi@mail.com'),(4,'dung','Phạm Quốc Dũng','0909999999','dung@mail.com');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `venue_id` int NOT NULL,
  `event_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('upcoming','ongoing','finished','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  PRIMARY KEY (`event_id`),
  KEY `fk_event_venue` (`venue_id`),
  CONSTRAINT `fk_event_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_event_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,1,'Đêm nhạc Acoustic','2026-11-20 19:00:00','2026-11-20 22:00:00','upcoming'),(2,2,'Hài kịch cuối tuần','2026-12-05 20:00:00','2026-12-05 22:00:00','upcoming');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `type_id` int NOT NULL,
  `ticket_quantity` int NOT NULL,
  `total_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_status` enum('pending','paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `fk_order_customer` (`customer_id`),
  KEY `fk_order_alloc` (`type_id`),
  CONSTRAINT `fk_order_alloc` FOREIGN KEY (`type_id`) REFERENCES `ticket_allocations` (`type_id`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `orders_chk_1` CHECK ((`ticket_quantity` between 1 and 2))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,1,2,1000000.00,'2026-10-01 10:00:00','paid','momo','2026-10-01 10:05:00'),(2,2,2,2,400000.00,'2026-10-02 14:30:00','paid','card','2026-10-02 14:36:00'),(3,3,3,1,300000.00,'2026-10-04 23:54:20','pending',NULL,NULL),(4,4,2,1,200000.00,'2026-10-03 09:00:00','cancelled',NULL,NULL),(5,2,3,2,600000.00,'2026-10-03 16:00:00','paid','bank_transfer','2026-10-03 16:08:00'),(6,4,3,1,300000.00,'2026-10-05 00:16:32','pending',NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seats`
--

DROP TABLE IF EXISTS `seats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seats` (
  `seat_id` int NOT NULL AUTO_INCREMENT,
  `venue_id` int NOT NULL,
  `seat_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`seat_id`),
  UNIQUE KEY `uq_seat` (`venue_id`,`seat_number`),
  CONSTRAINT `fk_seat_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seats`
--

LOCK TABLES `seats` WRITE;
/*!40000 ALTER TABLE `seats` DISABLE KEYS */;
INSERT INTO `seats` VALUES (1,1,'A1','VIP'),(2,1,'A2','VIP'),(3,1,'A3','VIP'),(4,1,'A4','VIP'),(5,1,'A5','VIP'),(6,1,'B1','Standard'),(7,1,'B2','Standard'),(8,1,'B3','Standard'),(9,1,'B4','Standard'),(10,1,'B5','Standard'),(11,2,'H1','Hall'),(12,2,'H2','Hall'),(13,2,'H3','Hall'),(14,2,'H4','Hall'),(15,2,'H5','Hall'),(16,2,'H6','Hall');
/*!40000 ALTER TABLE `seats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_allocations`
--

DROP TABLE IF EXISTS `ticket_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_allocations` (
  `type_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `type_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_price` decimal(12,2) NOT NULL,
  `type_quantity` int NOT NULL,
  `type_avail` int NOT NULL,
  PRIMARY KEY (`type_id`),
  UNIQUE KEY `uq_alloc` (`event_id`,`type_name`),
  CONSTRAINT `fk_alloc_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_avail` CHECK (((`type_avail` >= 0) and (`type_avail` <= `type_quantity`))),
  CONSTRAINT `ticket_allocations_chk_1` CHECK ((`type_price` >= 0)),
  CONSTRAINT `ticket_allocations_chk_2` CHECK ((`type_quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_allocations`
--

LOCK TABLES `ticket_allocations` WRITE;
/*!40000 ALTER TABLE `ticket_allocations` DISABLE KEYS */;
INSERT INTO `ticket_allocations` VALUES (1,1,'VIP',500000.00,5,3),(2,1,'Standard',200000.00,5,3),(3,2,'Early Bird',300000.00,4,0);
/*!40000 ALTER TABLE `ticket_allocations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `ticket_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `seat_id` int NOT NULL,
  `qrcode` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('not_used','used','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_used',
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `qrcode` (`qrcode`),
  KEY `fk_ticket_order` (`order_id`),
  KEY `fk_ticket_seat` (`seat_id`),
  CONSTRAINT `fk_ticket_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `fk_ticket_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
INSERT INTO `tickets` VALUES (1,1,1,'QR-0001','not_used'),(2,1,2,'QR-0002','not_used'),(3,2,6,'QR-0003','used'),(4,2,7,'QR-0004','not_used'),(5,5,11,'QR-0005','not_used'),(6,5,12,'QR-0006','not_used');
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('admin1','hash_demo_1'),('an','hash_demo_2'),('binh','hash_demo_3'),('chi','hash_demo_4'),('dung','hash_demo_5');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_customer_orders`
--

DROP TABLE IF EXISTS `v_customer_orders`;
/*!50001 DROP VIEW IF EXISTS `v_customer_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_customer_orders` AS SELECT 
 1 AS `customer_id`,
 1 AS `full_name`,
 1 AS `order_id`,
 1 AS `event_name`,
 1 AS `type_name`,
 1 AS `ticket_quantity`,
 1 AS `total_price`,
 1 AS `payment_status`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_event_revenue`
--

DROP TABLE IF EXISTS `v_event_revenue`;
/*!50001 DROP VIEW IF EXISTS `v_event_revenue`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_event_revenue` AS SELECT 
 1 AS `event_id`,
 1 AS `event_name`,
 1 AS `doanh_thu`,
 1 AS `ve_da_ban`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_expired_pending_orders`
--

DROP TABLE IF EXISTS `v_expired_pending_orders`;
/*!50001 DROP VIEW IF EXISTS `v_expired_pending_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_expired_pending_orders` AS SELECT 
 1 AS `order_id`,
 1 AS `customer_id`,
 1 AS `type_id`,
 1 AS `ticket_quantity`,
 1 AS `created_at`,
 1 AS `so_phut_da_cho`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_ticket_availability`
--

DROP TABLE IF EXISTS `v_ticket_availability`;
/*!50001 DROP VIEW IF EXISTS `v_ticket_availability`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ticket_availability` AS SELECT 
 1 AS `event_name`,
 1 AS `type_id`,
 1 AS `type_name`,
 1 AS `type_price`,
 1 AS `type_quantity`,
 1 AS `type_avail`,
 1 AS `da_ban_hoac_giu_cho`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `venues`
--

DROP TABLE IF EXISTS `venues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venues` (
  `venue_id` int NOT NULL AUTO_INCREMENT,
  `venue_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` int NOT NULL,
  PRIMARY KEY (`venue_id`),
  CONSTRAINT `venues_chk_1` CHECK ((`capacity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venues`
--

LOCK TABLES `venues` WRITE;
/*!40000 ALTER TABLE `venues` DISABLE KEYS */;
INSERT INTO `venues` VALUES (1,'Nhà hát Hòa Bình','240 Ba Tháng Hai, Q10, TP.HCM',10),(2,'Sân khấu Phú Thọ','1 Lữ Gia, Q11, TP.HCM',6),(4,'Địa điểm thử','Test',100);
/*!40000 ALTER TABLE `venues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'MyTickets'
--

--
-- Final view structure for view `v_customer_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_customer_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_customer_orders` AS select `c`.`customer_id` AS `customer_id`,`c`.`full_name` AS `full_name`,`o`.`order_id` AS `order_id`,`e`.`event_name` AS `event_name`,`ta`.`type_name` AS `type_name`,`o`.`ticket_quantity` AS `ticket_quantity`,`o`.`total_price` AS `total_price`,`o`.`payment_status` AS `payment_status`,`o`.`created_at` AS `created_at` from (((`orders` `o` join `customers` `c` on((`o`.`customer_id` = `c`.`customer_id`))) join `ticket_allocations` `ta` on((`o`.`type_id` = `ta`.`type_id`))) join `events` `e` on((`ta`.`event_id` = `e`.`event_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_event_revenue`
--

/*!50001 DROP VIEW IF EXISTS `v_event_revenue`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_event_revenue` AS select `e`.`event_id` AS `event_id`,`e`.`event_name` AS `event_name`,coalesce(sum(`o`.`total_price`),0) AS `doanh_thu`,coalesce(sum(`o`.`ticket_quantity`),0) AS `ve_da_ban` from ((`events` `e` left join `ticket_allocations` `ta` on((`e`.`event_id` = `ta`.`event_id`))) left join `orders` `o` on(((`ta`.`type_id` = `o`.`type_id`) and (`o`.`payment_status` = 'paid')))) group by `e`.`event_id`,`e`.`event_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_expired_pending_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_expired_pending_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_expired_pending_orders` AS select `orders`.`order_id` AS `order_id`,`orders`.`customer_id` AS `customer_id`,`orders`.`type_id` AS `type_id`,`orders`.`ticket_quantity` AS `ticket_quantity`,`orders`.`created_at` AS `created_at`,timestampdiff(MINUTE,`orders`.`created_at`,now()) AS `so_phut_da_cho` from `orders` where ((`orders`.`payment_status` = 'pending') and (`orders`.`created_at` < (now() - interval 15 minute))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ticket_availability`
--

/*!50001 DROP VIEW IF EXISTS `v_ticket_availability`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ticket_availability` AS select `e`.`event_name` AS `event_name`,`ta`.`type_id` AS `type_id`,`ta`.`type_name` AS `type_name`,`ta`.`type_price` AS `type_price`,`ta`.`type_quantity` AS `type_quantity`,`ta`.`type_avail` AS `type_avail`,(`ta`.`type_quantity` - `ta`.`type_avail`) AS `da_ban_hoac_giu_cho` from (`ticket_allocations` `ta` join `events` `e` on((`ta`.`event_id` = `e`.`event_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-05  8:30:16
