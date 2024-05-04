const express = require("express");
const app = express();
const handlebars = require("express-handlebars");
const path = require("path");
const mongodbConnection = require("./configs/mongodb-connection");

app.engine(
  ".hbs",
  handlebars.create({
    helpers: require("./configs/handlebars-helpers"),
    extname: ".hbs",
  }).engine
);
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "/views"));

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const postService = require("./services/post-service");

app.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const search = req.query.search || "";
  try {
    const [posts, paginator] = await postService.list(collection, page, search);

    res.render("home", { title: "Test Board", search, paginator, posts });
  } catch (error) {
    console.log(error);
    res.render("home", { title: "Test Board" });
  }
});

app.get("/write", (req, res) => {
  res.render("write", { title: "Test Board", mode: "create" });
});

app.post("/write", async (req, res) => {
  const post = req.body;
  const result = await postService.writePost(collection, post);
  res.redirect(`/detail/${result.insertedId}`);
});

app.get("/detail/:id", async (req, res) => {
  const result = await postService.getDetailPost(collection, req.params.id);
  res.render("detail", {
    title: "Test Board",
    post: result,
  });
});

app.get("/modify/:id", async (req, res) => {
  const post = await postService.getPostById(collection, req.params.id);
  res.render("write", { title: "Test Board", mode: "modify", post });
});

app.post("/modify/", async (req, res) => {
  const { id, title, writer, password, content } = req.body;

  const post = {
    title,
    writer,
    password,
    content,
    createdDt: new Date().toISOString(),
  };

  const result = postService.updatePost(collection, id, post);
  res.redirect(`/detail/${id}`);
});

app.delete("/delete", async (req, res) => {
  try {
    const result = await postService.deletePost(collection, req.body);
    if (result.deletedCount !== 1) {
      throw new Error("delete is failed");
    }
    return res.json({ isSuccess: true });
  } catch (e) {
    console.log(e);
    return res.json({ isSuccess: false });
  }
});

app.post("/write-comment", async (req, res) => {
  const { id, name, password, comment } = req.body;
  const post = await postService.getPostByIdWithPassword(collection, id);

  if (post.comments) {
    post.comments.push({
      idx: post.comments.length + 1,
      name,
      password,
      comment,
      createdDt: new Date().toISOString(),
    });
  } else {
    post.comments = [
      {
        idx: 1,
        name,
        password,
        comment,
        createdDt: new Date().toISOString(),
      },
    ];
  }

  postService.updatePost(collection, id, post);
  return res.redirect(`/detail/${id}`);
});

app.delete("/delete-comment", async (req, res) => {
  const result = await postService.deleteComment(collection, req.body);
  return res.json(result);
});

app.post("/check-password", async (req, res) => {
  const { id, password } = req.body;
  console.log(req.body);
  const post = await postService.getPostByIdAndPassword(collection, {
    id,
    password,
  });
  if (!post) {
    return res.status(404).json({ isExist: false });
  } else {
    return res.json({ isExist: true });
  }
});

let collection;
app.listen(3000, async () => {
  console.log("Server Started");
  const mongoClient = await mongodbConnection();
  collection = mongoClient.db().collection("post");
  console.log("MongoDB connected");
});
