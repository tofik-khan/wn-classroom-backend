export const checkRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    // Defensive: JWT should already be validated by auth()
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Adjust this key to match your custom claim
    const roles =
      req.auth.payload[process.env.AUTH0_AUTENTICATION_PAYLOAD] || [];

    // Normalize in case roles is a string
    const userRoles = Array.isArray(roles) ? roles : [roles];

    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        message: "Forbidden: insufficient role",
      });
    }

    next();
  };
};
