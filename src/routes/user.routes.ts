import { Router } from 'express';
import userController from '../controllers/user.controller';

const router = Router();

/**
 * @route /api/users
 */
router.get("/", userController.getAllUsers)
router.post("/", userController.createUser)

/**
 * @route /api/users/:id
 */
router.get("/:id", userController.getUserById)
router.put("/:id", userController.updateUser)
router.delete("/:id", userController.deleteUser)

export default router;
