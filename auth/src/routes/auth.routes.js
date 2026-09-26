import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

const authRouter = Router();

authRouter.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"]
  })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false, 
    failureRedirect: "/"
  }),
  async (req, res) => {
    try {
      const { id, displayName, emails, photos } = req.user;

      let user = await User.findOne({
        googleId: id
      });

      if (!user) {
        user = await User.create({
          googleId: id,
          name: displayName,
          email: emails?.[0]?.value,
          avatar: photos?.[0]?.value
        });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h"
        }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
      });

      return res.redirect("/");
    } catch (err) {
      console.error("Error in Google callback:", err);
      return res.redirect("/");
    }
  }
);

export default authRouter;