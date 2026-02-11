"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agentSuggestion_controller_1 = require("../controllers/agentSuggestion.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// GET /api/agent-suggestions?studentIvyServiceId=xxx&pointerNo=2&limit=10
// Get ranked agent suggestions based on student interest
router.get('/', (0, authorize_1.authorize)(roles_1.USER_ROLE.IVY_EXPERT), agentSuggestion_controller_1.getAgentSuggestionsHandler);
exports.default = router;
//# sourceMappingURL=agentSuggestion.routes.js.map