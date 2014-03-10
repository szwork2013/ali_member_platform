-- phpMyAdmin SQL Dump
-- version 4.0.6deb1
-- http://www.phpmyadmin.net
--
-- 主机: localhost
-- 生成日期: 2014-03-07 18:21:03
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
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time` datetime NOT NULL,
  `user` varchar(100) NOT NULL,
  `ip` varchar(32) NOT NULL,
  `type` varchar(16) NOT NULL,
  `object` varchar(32) NOT NULL,
  `info` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=14 ;

--
-- 转存表中的数据 `log`
--

INSERT INTO `log` (`id`, `time`, `user`, `ip`, `type`, `object`, `info`) VALUES
(1, '2014-03-06 00:00:00', 'test', '192.168.1.10', 'INFO', 'login', '哈哈哈哈'),
(2, '2014-03-05 00:00:00', '', '', '', '', '大大'),
(3, '0000-00-00 00:00:00', 'tattoo', '', 'INFO', 'login', '用户登录成功'),
(4, '2014-03-06 17:43:07', 'tattoo', '', 'INFO', 'login', '用户tattoo使用阿狸官网帐号"tangramor"登录成功'),
(5, '2014-03-06 18:06:18', 'tattoo', '127.0.0.1', 'INFO', 'login', '用户tattoo使用阿狸官网帐号"tangramor"登录成功'),
(6, '2014-03-07 17:07:17', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品{\n  "code": 400,\n  "error": "invalid_request",\n  "error_description": "The access token was not found"\n}'),
(7, '2014-03-07 17:20:17', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品Cannot POST /api/associate/'),
(8, '2014-03-07 17:23:02', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品Cannot POST /api/associate/'),
(9, '2014-03-07 17:24:05', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品Cannot POST /api/associate/'),
(10, '2014-03-07 17:24:38', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品Cannot POST /api/associate/'),
(11, '2014-03-07 17:25:48', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员王 俊华关联了产品Cannot POST /api/associate/'),
(12, '2014-03-07 18:17:02', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员admin关联了产品Cannot POST /api/associate/'),
(13, '2014-03-07 18:17:36', 'tattoo', '127.0.0.1', 'INFO', 'account.product', '会员关联了产品Cannot POST /api/associate/');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
