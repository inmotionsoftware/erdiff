ALTER TABLE users ADD COLUMN nickname TEXT;
CREATE UNIQUE INDEX unique_emails ON users(email);

CREATE TABLE new_likes (
  postid INT,
  userid INT,
  created timestamp default current_timestamp,
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
CREATE PROCEDURE prune_posts() 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE posts 
    SET deleted=NOW() 
    WHERE postid in (
      SELECT posts.postid AS postid
        FROM posts
          JOIN users ON (posts.userid=users.userid)
        WHERE 
          posts.deleted IS NULL AND
          users.deleted > CURRENT_DATE - '1 months'::interval
    );
END;$$;

CREATE PROCEDURE top_likers(IN foremail text)
LANGUAGE plpgsql
AS $$
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
END;$$;

