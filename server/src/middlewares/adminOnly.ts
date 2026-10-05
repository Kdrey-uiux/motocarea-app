import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const role = req.userRole?.toUpperCase();
  if (role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required.',
    });
    return;
  }
  next();
}
