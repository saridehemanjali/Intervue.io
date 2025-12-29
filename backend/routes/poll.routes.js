import express from "express";
import { createPoll, getPollHistory } from "../controllers/poll.controller.js";

const router = express.Router();

router.post("/create", createPoll);
router.get("/history", getPollHistory);

export default router;
