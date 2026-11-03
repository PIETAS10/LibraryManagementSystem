import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../../services/dashboard/dashboard.service';

export const getDashboardOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await dashboardService.getDashboardOverview();

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu tổng quan thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
};