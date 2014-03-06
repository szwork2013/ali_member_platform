-- phpMyAdmin SQL Dump
-- version 4.0.6deb1
-- http://www.phpmyadmin.net
--
-- 主机: localhost
-- 生成日期: 2014-03-06 15:36:45
-- 服务器版本: 5.5.35-0ubuntu0.13.10.2
-- PHP 版本: 5.5.3-1ubuntu2.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- 数据库: `ali_member_platform_logs`
--
CREATE DATABASE IF NOT EXISTS `ali_member_platform_logs` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `ali_member_platform_logs`;

-- --------------------------------------------------------

--
-- 表的结构 `log`
--

DROP TABLE IF EXISTS `log`;
CREATE TABLE IF NOT EXISTS `log` (
  `time` datetime NOT NULL,
  `user` varchar(100) NOT NULL,
  `ip` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `object` varchar(32) NOT NULL,
  `info` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
