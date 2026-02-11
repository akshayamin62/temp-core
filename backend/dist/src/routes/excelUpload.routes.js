"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const excelUpload_controller_1 = require("../controllers/excelUpload.controller");
const router = (0, express_1.Router)();
// POST /api/excel-upload - Upload and parse Excel file (Admin only)
router.post('/', excelUpload_controller_1.uploadMiddleware, excelUpload_controller_1.uploadExcelFile);
exports.default = router;
//# sourceMappingURL=excelUpload.routes.js.map