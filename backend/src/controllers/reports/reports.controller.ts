
import { Request, Response, NextFunction } from 'express';
import * as reportsService from '../../services/reports/reports.service';

export const getReportsOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await reportsService.getReportsOverview({
      from:
        typeof req.query.from === 'string'
          ? req.query.from
          : undefined,
      to:
        typeof req.query.to === 'string'
          ? req.query.to
          : undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy báo cáo thống kê thành công',
      data,
    });
  } catch (error) {
    next(error);
  }
};
