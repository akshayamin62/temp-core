"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIvyExpertPerformanceHandler = void 0;
const ivyExpertPerformance_service_1 = require("../services/ivyExpertPerformance.service");
const getIvyExpertPerformanceHandler = async (_req, res) => {
    try {
        // Ideally ensure user is ADMIN here, but we'll rely on route middleware or assume role check
        const metrics = await (0, ivyExpertPerformance_service_1.getIvyExpertPerformance)();
        res.status(200).json({
            success: true,
            message: 'Ivy Expert performance metrics retrieved successfully',
            data: metrics,
        });
    }
    catch (error) {
        console.error('Error fetching Ivy Expert performance:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch Ivy Expert performance',
        });
    }
};
exports.getIvyExpertPerformanceHandler = getIvyExpertPerformanceHandler;
//# sourceMappingURL=ivyExpertPerformance.controller.js.map