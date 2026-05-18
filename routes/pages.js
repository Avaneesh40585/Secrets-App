import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/feed");
  res.render("home");
});

// Legacy redirect from old /secrets URL
router.get("/secrets", (req, res) => {
  res.redirect("/feed");
});

export default router;
