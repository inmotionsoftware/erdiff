ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD UNIQUE unique_emails(email(250));

CREATE TABLE new_likes (
  postid INTEGER,
  userid INTEGER,
  created datetime default current_timestamp,
  PRIMARY KEY(postid,userid),
  FOREIGN KEY(postid) REFERENCES posts(postid),
  FOREIGN KEY(userid) REFERENCES users(userid)
);

INSERT INTO new_likes SELECT postid, userid, created FROM likes;

DROP TABLE likes;

ALTER TABLE new_likes RENAME TO likes;

CREATE VIEW stats AS
WITH lc AS (
  SELECT
    postid,
    count(userid) AS count
  FROM likes GROUP BY postid
),rc AS (
  SELECT
    posts.postid,
    posts.userid,
    count(replies.postid) AS count
  FROM posts AS posts
    LEFT JOIN posts AS replies ON (posts.postid = replies.inreplyto)
  GROUP BY posts.postid, posts.userid)
SELECT
    posts.userid,
    posts.title,
    lc.count AS likecount,
    rc.count AS replycount,
    rc.count/lc.count AS ratio 
  FROM posts AS posts
    LEFT JOIN lc USING(postid)
    LEFT JOIN rc USING (postid, userid)
  WHERE
    posts.inreplyto IS NULL
;

DROP PROCEDURE IF EXISTS prune_posts;
DELIMITER $$
CREATE PROCEDURE prune_posts() 
BEGIN
  UPDATE posts 
    SET deleted=NOW() 
    WHERE postid in (
      SELECT posts.postid AS postid
        FROM posts
          JOIN users ON (posts.userid=users.userid)
        WHERE 
          posts.deleted IS NULL AND
          users.deleted > DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)
    );
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE top_likers(IN foremail text)
BEGIN
SELECT
    count(1) AS num,
    likers.name
  FROM users AS source
    JOIN posts AS posts ON (source.userid=posts.userid)
    JOIN likes AS liked ON (posts.postid=liked.postid)
    JOIN users AS likers ON (liked.userid=likers.userid)
  WHERE
    liked.deleted IS NULL
    AND source.email = foremail

  GROUP BY likers.name
  HAVING num > 1 
  ORDER BY 1
  LIMIT 5
;
END$$
DELIMITER ;

