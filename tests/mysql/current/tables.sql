CREATE TABLE users (
  userid INTEGER, 
  name TEXT, 
  email TEXT,
  password TEXT, 
  created datetime default current_timestamp,
  updated datetime default current_timestamp,
  deleted datetime default current_timestamp,
  PRIMARY KEY(userid ASC)
);

CREATE TABLE posts (
  postid INTEGER, 
  title TEXT, 
  body TEXT,
  userid INTEGER, 
  inreplyto INTEGER, 
  created datetime default current_timestamp,
  updated datetime default current_timestamp,
  deleted datetime default current_timestamp,
  PRIMARY KEY(postid ASC),
  FOREIGN KEY(userid) REFERENCES users(userid),
  FOREIGN KEY(inreplyto) REFERENCES posts(postid)
);

CREATE TABLE likes (
  postid INTEGER,
  userid INTEGER,
  created datetime default current_timestamp,
  deleted datetime default current_timestamp,
  PRIMARY KEY(postid,userid),
  FOREIGN KEY(postid) REFERENCES posts(postid),
  FOREIGN KEY(userid) REFERENCES users(userid)
);


DELIMITER $$
CREATE PROCEDURE prune_accounts() 
BEGIN
  UPDATE users SET deleted=NOW() WHERE updated < DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH);
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE prune_posts() 
BEGIN
  -- this is a bad implementation, need to fix later
  UPDATE posts SET deleted=NOW() WHERE deleted IS NULL AND userid in (SELECT userid FROM users WHERE deleted > DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH));
END$$
DELIMITER ;
