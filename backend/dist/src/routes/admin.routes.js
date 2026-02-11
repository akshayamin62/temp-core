"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ivyExpertPerformance_controller_1 = require("../controllers/ivyExpertPerformance.controller");
const router = express_1.default.Router();
// GET /admin/ivy-expert/performance
router.get('/ivy-expert/performance', ivyExpertPerformance_controller_1.getIvyExpertPerformanceHandler);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map