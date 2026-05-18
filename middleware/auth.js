import * as notifications from "../db/notifications.js";
import { getPulseData } from "../db/pulse.js";

export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.redirect("/login");
}

// Inject unreadCount into res.locals so every authenticated render has it
export async function attachUnreadCount(req, res, next) {
  if (req.user) {
    try {
      res.locals.unreadCount = await notifications.unreadCount(req.user.id);
    } catch (e) {
      res.locals.unreadCount = 0;
    }
  }
  next();
}

// Render helper — exposes user + unreadCount + flash to all views
export function attachLocals(req, res, next) {
  res.locals.user = req.user || null;
  res.locals.activePage = res.locals.activePage || "";
  res.locals.unreadCount = res.locals.unreadCount || 0;
  next();
}

// Pulse sidebar data — only on routes that show the sidebar
export async function attachPulse(req, res, next) {
  if (req.user) {
    try {
      res.locals.pulse = await getPulseData(req.user.id);
      res.locals.hasPulse = true;
    } catch (e) {
      res.locals.pulse = null;
      res.locals.hasPulse = false;
    }
  }
  next();
}
