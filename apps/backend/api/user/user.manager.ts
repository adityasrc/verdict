import { prisma } from "../../utils/db.js";

export class UserManager {
    constructor() {}

    async getUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: { 
                id: true, 
                name: true, 
                email: true, 
                role: true 
            }
        });
    }
}