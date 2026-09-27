import { Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No authorization token provided. Please log in.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session token.',
      });
      return;
    }

    // Alamin ang role mula sa profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    req.user = user;
    req.userRole = profile?.role || 'CUSTOMER';

    next();
  } catch (err: unknown) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server authentication error.',
    });
  }
}
