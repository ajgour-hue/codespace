import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import  {sendAuthNotification} from "../config/mq.js";

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
    failureRedirect: "http://localhost:5173/login"
  }),

  async (req, res) => {
    try {
      const { id, displayName, emails, photos } = req.user;

      const email = emails?.[0]?.value;
      const avatar = photos?.[0]?.value;

      console.log("GOOGLE ID:", id);
      console.log("GOOGLE EMAIL:", email);

      let user = await User.findOne({
        $or: [
          { googleId: id },
          { email: email }
        ]
      });

      console.log("USER FOUND:", user);

      if (!user) {
        user = await User.create({
          googleId: id,
          name: displayName,
          email: email,
          avatar: avatar
        });

        console.log("NEW USER CREATED:", user);
      } else if (user.googleId !== id) {
        user.googleId = id;
        user.avatar = avatar;
        await user.save();

        console.log("GOOGLE ID UPDATED:", user._id);
      }

      if (!user) {
        throw new Error("User is null after find/create");
      }

      console.log("FINAL USER ID:", user._id);

      await sendAuthNotification({
        userId: user._id,
        action: "google_login",
        timestamp: new Date(),
        email: user.email
      });

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

      return res.redirect("http://localhost:5173");

    } catch (err) {
      console.error("GOOGLE CALLBACK ERROR:", err);

      return res.status(500).json({
        message: "Google authentication failed",
        error: err.message
      });
    }
  }
);


export default authRouter;