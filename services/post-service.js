const paginator = require("../utils/paginator");
const { ObjectId } = require("mongodb");

async function list(collection, page, search) {
  const perPage = 10;
  const query = { title: new RegExp(search, "i") };
  const cursor = collection
    .find(query, { limit: perPage, skip: (page - 1) * perPage })
    .sort({ createdDt: -1 });

  const totalCount = await collection.count(query);
  const posts = await cursor.toArray();

  const paginatorObj = paginator({ totalCount, page, perPage: perPage });
  return [posts, paginatorObj];
}

async function writePost(collection, post) {
  post.hits = 0;
  post.createdDt = new Date().toDateString();
  return await collection.insertOne(post);
}

const projectionOption = {
  projection: {
    password: 0,
    "comments.password": 0,
  },
};

async function getDetailPost(collection, id) {
  return await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { hits: 1 } },
    projectionOption
  );
}

async function getPostByIdAndPassword(collection, { id, password }) {
  return await collection.findOne(
    { _id: new ObjectId(id), password: password },
    projectionOption
  );
}

async function getPostById(collection, id) {
  return await collection.findOne({ _id: new ObjectId(id) }, projectionOption);
}

async function getPostByIdWithPassword(collection, id) {
  return await collection.findOne({ _id: new ObjectId(id) });
}

async function updatePost(collection, id, post) {
  const toUpdatePost = {
    $set: {
      ...post,
    },
  };
  return await collection.updateOne({ _id: new ObjectId(id) }, toUpdatePost);
}

async function deletePost(collection, { id, password }) {
  return await collection.deleteOne({ _id: new ObjectId(id), password });
}

async function deleteComment(collection, { id, idx, password }) {
  const post = await collection.findOne({
    _id: new ObjectId(id),
    comments: { $elemMatch: { idx: +idx, password } },
  });
  if (!post) {
    return { isSuccess: false };
  }

  post.comments = post.comments.filter((comment) => comment.idx != idx);
  updatePost(collection, id, post);
  return { isSuccess: true };
}

module.exports = {
  list,
  writePost,
  getDetailPost,
  getPostById,
  getPostByIdAndPassword,
  updatePost,
  deletePost,
  deleteComment,
  getPostByIdWithPassword,
};
