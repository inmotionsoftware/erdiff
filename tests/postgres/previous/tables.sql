CREATE TABLE users (
  userid SERIAL PRIMARY KEY, 
  name TEXT, 
  email TEXT,
  password TEXT, 
  created timestamp default current_timestamp,
  updated timestamp default current_timestamp,
  deleted timestamp default current_timestamp
);

CREATE TABLE posts (
  postid SERIAL PRIMARY KEY, 
  title TEXT, 
  body TEXT,
  userid INT, 
  inreplyto INT, 
  created timestamp default current_timestamp,
  updated timestamp default current_timestamp,
  deleted timestamp default current_timestamp,
  FOREIGN KEY(userid) REFERENCES users(userid),
  FOREIGN KEY(inreplyto) REFERENCES posts(postid)
);

CREATE TABLE likes (
  postid INT,
  userid INT,
  created timestamp default current_timestamp,
  deleted timestamp default current_timestamp,
  PRIMARY KEY(postid,userid),
  FOREIGN KEY(postid) REFERENCES posts(postid),
  FOREIGN KEY(userid) REFERENCES users(userid)
);


CREATE PROCEDURE prune_accounts() 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET deleted=NOW() WHERE updated < CURRENT_DATE - '6 months'::interval;
END;$$ ;

CREATE PROCEDURE prune_posts() 
LANGUAGE plpgsql
AS $$
BEGIN
  -- this is a bad implementation, need to fix later
  UPDATE posts SET deleted=NOW() WHERE deleted IS NULL AND userid in (SELECT userid FROM users WHERE deleted > CURRENT_DATE - '1 months'::interval);
END;$$;
