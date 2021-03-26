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


ALTER TABLE users ADD COLUMN nickname TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS unique_emails ON users(email);

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

