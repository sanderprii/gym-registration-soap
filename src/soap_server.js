const express = require('express');
const soap = require('soap');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Initialize Prisma client
const prisma = new PrismaClient();

const app = express();
const port = process.env.SOAP_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// Track revoked tokens for logout (in production use Redis or database)
const revokedTokens = new Set();

// SOAP Service Implementation
const gymRegistrationService = {
    GymRegistrationService: {
        GymRegistrationPort: {
            // Session Operations
            async Login(args, callback) {
                try {
                    const { email, password } = args;

                    if (!email || !password) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Email and password are required'
                            }
                        });
                    }

                    const trainee = await prisma.trainee.findUnique({
                        where: { email }
                    });

                    if (!trainee || trainee.password !== password) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid credentials'
                            }
                        });
                    }

                    const token = jwt.sign(
                        { traineeId: trainee.id, email: trainee.email },
                        JWT_SECRET,
                        { expiresIn: '2h' }
                    );

                    const { password: _, ...traineeWithoutPassword } = trainee;

                    callback(null, {
                        token,
                        trainee: {
                            id: traineeWithoutPassword.id,
                            name: traineeWithoutPassword.name,
                            email: traineeWithoutPassword.email,
                            timezone: traineeWithoutPassword.timezone || '',
                            createdAt: traineeWithoutPassword.createdAt,
                            updatedAt: traineeWithoutPassword.updatedAt
                        }
                    });
                } catch (error) {
                    console.error('Login error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async Logout(args, callback) {
                try {
                    const { token } = args;

                    if (!token) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Token is required'
                            }
                        });
                    }

                    // Verify token
                    jwt.verify(token, JWT_SECRET, (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        revokedTokens.add(token);
                        callback(null, { message: 'Successfully logged out' });
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async CheckSession(args, callback) {
                try {
                    const { token } = args;

                    if (!token) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Token is required'
                            }
                        });
                    }

                    if (revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Token is revoked'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err, userData) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const trainee = await prisma.trainee.findUnique({
                            where: { id: userData.traineeId }
                        });

                        if (!trainee) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Trainee not found'
                                }
                            });
                        }

                        const { password: _, ...traineeWithoutPassword } = trainee;

                        callback(null, {
                            authenticated: true,
                            trainee: {
                                id: traineeWithoutPassword.id,
                                name: traineeWithoutPassword.name,
                                email: traineeWithoutPassword.email,
                                timezone: traineeWithoutPassword.timezone || '',
                                createdAt: traineeWithoutPassword.createdAt,
                                updatedAt: traineeWithoutPassword.updatedAt
                            }
                        });
                    });
                } catch (error) {
                    console.error('CheckSession error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            // Trainee Operations
            async GetTrainees(args, callback) {
                try {
                    const { token, page = 1, pageSize = 20 } = args;

                    // Verify token
                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const skip = (page - 1) * pageSize;
                        const [trainees, total] = await prisma.$transaction([
                            prisma.trainee.findMany({
                                skip,
                                take: pageSize,
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    timezone: true,
                                    createdAt: true,
                                    updatedAt: true
                                }
                            }),
                            prisma.trainee.count()
                        ]);

                        callback(null, {
                            trainees: trainees.map(trainee => ({
                                id: trainee.id,
                                name: trainee.name,
                                email: trainee.email,
                                timezone: trainee.timezone || '',
                                createdAt: trainee.createdAt,
                                updatedAt: trainee.updatedAt
                            })),
                            pagination: {
                                page,
                                pageSize,
                                total
                            }
                        });
                    });
                } catch (error) {
                    console.error('GetTrainees error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async CreateTrainee(args, callback) {
                try {
                    const { name, email, password, timezone } = args;

                    if (!name || !email || !password) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Name, email, and password are required'
                            }
                        });
                    }

                    const existingTrainee = await prisma.trainee.findUnique({
                        where: { email }
                    });

                    if (existingTrainee) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Email is already in use'
                            }
                        });
                    }

                    const newTrainee = await prisma.trainee.create({
                        data: {
                            name,
                            email,
                            password,
                            timezone
                        },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            timezone: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    });

                    callback(null, {
                        id: newTrainee.id,
                        name: newTrainee.name,
                        email: newTrainee.email,
                        timezone: newTrainee.timezone || '',
                        createdAt: newTrainee.createdAt,
                        updatedAt: newTrainee.updatedAt
                    });
                } catch (error) {
                    console.error('CreateTrainee error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async GetTrainee(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const trainee = await prisma.trainee.findUnique({
                            where: { id },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                timezone: true,
                                createdAt: true,
                                updatedAt: true
                            }
                        });

                        if (!trainee) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Trainee not found'
                                }
                            });
                        }

                        callback(null, {
                            id: trainee.id,
                            name: trainee.name,
                            email: trainee.email,
                            timezone: trainee.timezone || '',
                            createdAt: trainee.createdAt,
                            updatedAt: trainee.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('GetTrainee error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async UpdateTrainee(args, callback) {
                try {
                    const { token, trainee: updateData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { id, name, email, password, timezone } = updateData;
                        const updateFields = {};
                        if (name !== undefined) updateFields.name = name;
                        if (email !== undefined) updateFields.email = email;
                        if (password !== undefined) updateFields.password = password;
                        if (timezone !== undefined) updateFields.timezone = timezone;

                        try {
                            const updatedTrainee = await prisma.trainee.update({
                                where: { id },
                                data: updateFields,
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    timezone: true,
                                    createdAt: true,
                                    updatedAt: true
                                }
                            });

                            callback(null, {
                                id: updatedTrainee.id,
                                name: updatedTrainee.name,
                                email: updatedTrainee.email,
                                timezone: updatedTrainee.timezone || '',
                                createdAt: updatedTrainee.createdAt,
                                updatedAt: updatedTrainee.updatedAt
                            });
                        } catch (updateError) {
                            if (updateError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Trainee not found'
                                    }
                                });
                            }
                            throw updateError;
                        }
                    });
                } catch (error) {
                    console.error('UpdateTrainee error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async DeleteTrainee(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        try {
                            await prisma.trainee.delete({
                                where: { id }
                            });

                            callback(null, { success: true });
                        } catch (deleteError) {
                            if (deleteError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Trainee not found'
                                    }
                                });
                            }
                            throw deleteError;
                        }
                    });
                } catch (error) {
                    console.error('DeleteTrainee error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            // Workout Operations
            async GetWorkouts(args, callback) {
                try {
                    const { token } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const workouts = await prisma.workout.findMany({
                            orderBy: { createdAt: 'desc' }
                        });

                        callback(null, workouts.map(workout => ({
                            id: workout.id,
                            name: workout.name,
                            duration: workout.duration,
                            description: workout.description || '',
                            color: workout.color || '',
                            createdAt: workout.createdAt,
                            updatedAt: workout.updatedAt
                        })));
                    });
                } catch (error) {
                    console.error('GetWorkouts error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async CreateWorkout(args, callback) {
                try {
                    const { token, workout: workoutData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { name, duration, description, color } = workoutData;

                        if (!name || !duration) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Name and duration are required'
                                }
                            });
                        }

                        const newWorkout = await prisma.workout.create({
                            data: {
                                name,
                                duration,
                                description,
                                color
                            }
                        });

                        callback(null, {
                            id: newWorkout.id,
                            name: newWorkout.name,
                            duration: newWorkout.duration,
                            description: newWorkout.description || '',
                            color: newWorkout.color || '',
                            createdAt: newWorkout.createdAt,
                            updatedAt: newWorkout.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('CreateWorkout error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async GetWorkout(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const workout = await prisma.workout.findUnique({
                            where: { id }
                        });

                        if (!workout) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Workout not found'
                                }
                            });
                        }

                        callback(null, {
                            id: workout.id,
                            name: workout.name,
                            duration: workout.duration,
                            description: workout.description || '',
                            color: workout.color || '',
                            createdAt: workout.createdAt,
                            updatedAt: workout.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('GetWorkout error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async UpdateWorkout(args, callback) {
                try {
                    const { token, workout: updateData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { id, name, duration, description, color } = updateData;
                        const updateFields = {};
                        if (name !== undefined) updateFields.name = name;
                        if (duration !== undefined) updateFields.duration = duration;
                        if (description !== undefined) updateFields.description = description;
                        if (color !== undefined) updateFields.color = color;

                        try {
                            const updatedWorkout = await prisma.workout.update({
                                where: { id },
                                data: updateFields
                            });

                            callback(null, {
                                id: updatedWorkout.id,
                                name: updatedWorkout.name,
                                duration: updatedWorkout.duration,
                                description: updatedWorkout.description || '',
                                color: updatedWorkout.color || '',
                                createdAt: updatedWorkout.createdAt,
                                updatedAt: updatedWorkout.updatedAt
                            });
                        } catch (updateError) {
                            if (updateError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Workout not found'
                                    }
                                });
                            }
                            throw updateError;
                        }
                    });
                } catch (error) {
                    console.error('UpdateWorkout error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async DeleteWorkout(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        try {
                            await prisma.workout.delete({
                                where: { id }
                            });

                            callback(null, { success: true });
                        } catch (deleteError) {
                            if (deleteError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Workout not found'
                                    }
                                });
                            }
                            throw deleteError;
                        }
                    });
                } catch (error) {
                    console.error('DeleteWorkout error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            // Routine Operations
            async GetRoutines(args, callback) {
                try {
                    const { token, traineeId } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const whereClause = traineeId ? { userId: traineeId } : {};
                        const routines = await prisma.routine.findMany({
                            where: whereClause,
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        });

                        callback(null, routines.map(routine => ({
                            id: routine.id,
                            userId: routine.userId,
                            availability: JSON.parse(routine.availability),
                            trainee: {
                                id: routine.trainee.id,
                                name: routine.trainee.name,
                                email: routine.trainee.email,
                                timezone: routine.trainee.timezone || '',
                                createdAt: routine.trainee.createdAt,
                                updatedAt: routine.trainee.updatedAt
                            },
                            createdAt: routine.createdAt,
                            updatedAt: routine.updatedAt
                        })));
                    });
                } catch (error) {
                    console.error('GetRoutines error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async CreateRoutine(args, callback) {
                try {
                    const { token, routine: routineData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { userId, availability } = routineData;

                        if (!userId || !availability) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'userId and availability are required'
                                }
                            });
                        }

                        const trainee = await prisma.trainee.findUnique({
                            where: { id: userId }
                        });

                        if (!trainee) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Trainee not found'
                                }
                            });
                        }

                        const newRoutine = await prisma.routine.create({
                            data: {
                                userId,
                                availability: JSON.stringify(availability)
                            },
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            }
                        });

                        callback(null, {
                            id: newRoutine.id,
                            userId: newRoutine.userId,
                            availability: JSON.parse(newRoutine.availability),
                            trainee: {
                                id: newRoutine.trainee.id,
                                name: newRoutine.trainee.name,
                                email: newRoutine.trainee.email,
                                timezone: newRoutine.trainee.timezone || '',
                                createdAt: newRoutine.trainee.createdAt,
                                updatedAt: newRoutine.trainee.updatedAt
                            },
                            createdAt: newRoutine.createdAt,
                            updatedAt: newRoutine.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('CreateRoutine error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async GetTraineeRoutine(args, callback) {
                try {
                    const { token, traineeId } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const routine = await prisma.routine.findFirst({
                            where: { userId: traineeId },
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            }
                        });

                        if (!routine) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Routine not found'
                                }
                            });
                        }

                        callback(null, {
                            id: routine.id,
                            userId: routine.userId,
                            availability: JSON.parse(routine.availability),
                            trainee: {
                                id: routine.trainee.id,
                                name: routine.trainee.name,
                                email: routine.trainee.email,
                                timezone: routine.trainee.timezone || '',
                                createdAt: routine.trainee.createdAt,
                                updatedAt: routine.trainee.updatedAt
                            },
                            createdAt: routine.createdAt,
                            updatedAt: routine.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('GetTraineeRoutine error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async UpdateRoutine(args, callback) {
                try {
                    const { token, routine: updateData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { traineeId, availability } = updateData;

                        if (!availability) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'availability is required'
                                }
                            });
                        }

                        const updatedRoutine = await prisma.routine.updateMany({
                            where: { userId: traineeId },
                            data: {
                                availability: JSON.stringify(availability)
                            }
                        });

                        if (updatedRoutine.count === 0) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Routine not found'
                                }
                            });
                        }

                        const routine = await prisma.routine.findFirst({
                            where: { userId: traineeId },
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            }
                        });

                        callback(null, {
                            id: routine.id,
                            userId: routine.userId,
                            availability: JSON.parse(routine.availability),
                            trainee: {
                                id: routine.trainee.id,
                                name: routine.trainee.name,
                                email: routine.trainee.email,
                                timezone: routine.trainee.timezone || '',
                                createdAt: routine.trainee.createdAt,
                                updatedAt: routine.trainee.updatedAt
                            },
                            createdAt: routine.createdAt,
                            updatedAt: routine.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('UpdateRoutine error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async DeleteRoutine(args, callback) {
                try {
                    const { token, traineeId } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const deletedRoutine = await prisma.routine.deleteMany({
                            where: { userId: traineeId }
                        });

                        if (deletedRoutine.count === 0) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Routine not found'
                                }
                            });
                        }

                        callback(null, { success: true });
                    });
                } catch (error) {
                    console.error('DeleteRoutine error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            // Registration Operations
            async GetRegistrations(args, callback) {
                try {
                    const { token } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const registrations = await prisma.registration.findMany({
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        });

                        callback(null, registrations.map(registration => ({
                            id: registration.id,
                            eventId: registration.eventId,
                            userId: registration.userId,
                            inviteeEmail: registration.inviteeEmail,
                            startTime: registration.startTime,
                            endTime: registration.endTime,
                            status: registration.status,
                            trainee: {
                                id: registration.trainee.id,
                                name: registration.trainee.name,
                                email: registration.trainee.email,
                                timezone: registration.trainee.timezone || '',
                                createdAt: registration.trainee.createdAt,
                                updatedAt: registration.trainee.updatedAt
                            },
                            createdAt: registration.createdAt,
                            updatedAt: registration.updatedAt
                        })));
                    });
                } catch (error) {
                    console.error('GetRegistrations error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async CreateRegistration(args, callback) {
                try {
                    const { token, registration: registrationData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { eventId, userId, inviteeEmail, startTime, endTime, status } = registrationData;

                        if (!eventId || !userId || !inviteeEmail || !startTime) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'eventId, userId, inviteeEmail, and startTime are required'
                                }
                            });
                        }

                        const trainee = await prisma.trainee.findUnique({
                            where: { id: userId }
                        });

                        if (!trainee) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Trainee not found'
                                }
                            });
                        }

                        const newRegistration = await prisma.registration.create({
                            data: {
                                eventId,
                                userId,
                                inviteeEmail,
                                startTime: new Date(startTime),
                                endTime: endTime ? new Date(endTime) : null,
                                status: status || 'scheduled'
                            },
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            }
                        });

                        callback(null, {
                            id: newRegistration.id,
                            eventId: newRegistration.eventId,
                            userId: newRegistration.userId,
                            inviteeEmail: newRegistration.inviteeEmail,
                            startTime: newRegistration.startTime,
                            endTime: newRegistration.endTime,
                            status: newRegistration.status,
                            trainee: {
                                id: newRegistration.trainee.id,
                                name: newRegistration.trainee.name,
                                email: newRegistration.trainee.email,
                                timezone: newRegistration.trainee.timezone || '',
                                createdAt: newRegistration.trainee.createdAt,
                                updatedAt: newRegistration.trainee.updatedAt
                            },
                            createdAt: newRegistration.createdAt,
                            updatedAt: newRegistration.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('CreateRegistration error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async GetRegistration(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const registration = await prisma.registration.findUnique({
                            where: { id },
                            include: {
                                trainee: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        timezone: true,
                                        createdAt: true,
                                        updatedAt: true
                                    }
                                }
                            }
                        });

                        if (!registration) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Registration not found'
                                }
                            });
                        }

                        callback(null, {
                            id: registration.id,
                            eventId: registration.eventId,
                            userId: registration.userId,
                            inviteeEmail: registration.inviteeEmail,
                            startTime: registration.startTime,
                            endTime: registration.endTime,
                            status: registration.status,
                            trainee: {
                                id: registration.trainee.id,
                                name: registration.trainee.name,
                                email: registration.trainee.email,
                                timezone: registration.trainee.timezone || '',
                                createdAt: registration.trainee.createdAt,
                                updatedAt: registration.trainee.updatedAt
                            },
                            createdAt: registration.createdAt,
                            updatedAt: registration.updatedAt
                        });
                    });
                } catch (error) {
                    console.error('GetRegistration error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async UpdateRegistration(args, callback) {
                try {
                    const { token, registration: updateData } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        const { id, eventId, userId, inviteeEmail, startTime, endTime, status } = updateData;
                        const updateFields = {};
                        if (eventId !== undefined) updateFields.eventId = eventId;
                        if (userId !== undefined) updateFields.userId = userId;
                        if (inviteeEmail !== undefined) updateFields.inviteeEmail = inviteeEmail;
                        if (startTime !== undefined) updateFields.startTime = new Date(startTime);
                        if (endTime !== undefined) updateFields.endTime = endTime ? new Date(endTime) : null;
                        if (status !== undefined) updateFields.status = status;

                        try {
                            const updatedRegistration = await prisma.registration.update({
                                where: { id },
                                data: updateFields,
                                include: {
                                    trainee: {
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                            timezone: true,
                                            createdAt: true,
                                            updatedAt: true
                                        }
                                    }
                                }
                            });

                            callback(null, {
                                id: updatedRegistration.id,
                                eventId: updatedRegistration.eventId,
                                userId: updatedRegistration.userId,
                                inviteeEmail: updatedRegistration.inviteeEmail,
                                startTime: updatedRegistration.startTime,
                                endTime: updatedRegistration.endTime,
                                status: updatedRegistration.status,
                                trainee: {
                                    id: updatedRegistration.trainee.id,
                                    name: updatedRegistration.trainee.name,
                                    email: updatedRegistration.trainee.email,
                                    timezone: updatedRegistration.trainee.timezone || '',
                                    createdAt: updatedRegistration.trainee.createdAt,
                                    updatedAt: updatedRegistration.trainee.updatedAt
                                },
                                createdAt: updatedRegistration.createdAt,
                                updatedAt: updatedRegistration.updatedAt
                            });
                        } catch (updateError) {
                            if (updateError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Registration not found'
                                    }
                                });
                            }
                            throw updateError;
                        }
                    });
                } catch (error) {
                    console.error('UpdateRegistration error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            },

            async DeleteRegistration(args, callback) {
                try {
                    const { token, id } = args;

                    if (!token || revokedTokens.has(token)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Invalid or missing token'
                            }
                        });
                    }

                    jwt.verify(token, JWT_SECRET, async (err) => {
                        if (err) {
                            return callback({
                                Fault: {
                                    faultcode: 'Client',
                                    faultstring: 'Invalid token'
                                }
                            });
                        }

                        try {
                            await prisma.registration.delete({
                                where: { id }
                            });

                            callback(null, { success: true });
                        } catch (deleteError) {
                            if (deleteError.code === 'P2025') {
                                return callback({
                                    Fault: {
                                        faultcode: 'Client',
                                        faultstring: 'Registration not found'
                                    }
                                });
                            }
                            throw deleteError;
                        }
                    });
                } catch (error) {
                    console.error('DeleteRegistration error:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: 'Internal server error'
                        }
                    });
                }
            }
        }
    }
};

// Read WSDL file
const wsdlFile = fs.readFileSync(path.join(__dirname, '../wsdl/gym_registration.wsdl'), 'utf8');

// Create SOAP server
soap.listen(app, '/soap', gymRegistrationService, wsdlFile, (err, res) => {
    if (err) {
        console.error('SOAP server error:', err);
    } else {
        console.log('SOAP server is listening on port ' + port);
        console.log('WSDL available at http://localhost:' + port + '/soap?wsdl');
    }
});

// Start the server
app.listen(port, () => {
    console.log('Gym Registration SOAP Service started on port ' + port);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});