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


