const express = require('express');
const soap = require('soap');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Prisma client
const prisma = new PrismaClient();

const app = express();
const port = process.env.SOAP_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// Track revoked tokens
const revokedTokens = new Set();

// Helper function to authenticate token
function authenticateToken(token) {
    if (!token) {
        throw new Error('Authorization token missing');
    }

    if (revokedTokens.has(token)) {
        throw new Error('Token is revoked');
    }

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        throw new Error('Invalid token');
    }
}

// Helper function to format trainee without password
function formatTrainee(trainee) {
    if (!trainee) return null;
    const { password, ...traineeWithoutPassword } = trainee;
    return traineeWithoutPassword;
}

// Helper function to format datetime
function formatDateTime(date) {
    return date ? new Date(date).toISOString() : null;
}

// SOAP Service Implementation
const serviceObject = {
    GymRegistrationService: {
        GymRegistrationPort: {
            // Session Operations
            async CreateSession(args) {
                try {
                    const { email, password } = args.request;

                    if (!email || !password) {
                        throw new Error('Email and password are required');
                    }

                    const trainee = await prisma.trainee.findUnique({
                        where: { email }
                    });

                    if (!trainee || trainee.password !== password) {
                        throw new Error('Invalid credentials');
                    }

                    const token = jwt.sign(
                        { traineeId: trainee.id, email: trainee.email },
                        JWT_SECRET,
                        { expiresIn: '2h' }
                    );

                    return {
                        token,
                        trainee: formatTrainee(trainee)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async DeleteSession(args) {
                try {
                    const { token } = args.request;
                    authenticateToken(token);
                    revokedTokens.add(token);
                    return { message: 'Successfully logged out' };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async CheckSession(args) {
                try {
                    const { token } = args.request;
                    const userData = authenticateToken(token);

                    const trainee = await prisma.trainee.findUnique({
                        where: { id: userData.traineeId }
                    });

                    if (!trainee) {
                        throw new Error('Trainee not found');
                    }

                    return {
                        authenticated: true,
                        trainee: formatTrainee(trainee)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            // Trainee Operations
            async ListTrainees(args) {
                try {
                    const { token } = args.request;
                    // Convert strings to integers
                    const page = parseInt(args.request.page || 1);
                    const pageSize = parseInt(args.request.pageSize || 20);

                    authenticateToken(token);

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

                    return {
                        data: trainees.map(t => ({
                            ...t,
                            createdAt: formatDateTime(t.createdAt),
                            updatedAt: formatDateTime(t.updatedAt)
                        })),
                        pagination: {
                            page,
                            pageSize,
                            total
                        }
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async CreateTrainee(args) {
                try {
                    const { name, email, password, timezone } = args.request;

                    if (!name || !email || !password) {
                        throw new Error('Name, email, and password are required');
                    }

                    const existingTrainee = await prisma.trainee.findUnique({
                        where: { email }
                    });

                    if (existingTrainee) {
                        throw new Error('Email is already in use');
                    }

                    const newTrainee = await prisma.trainee.create({
                        data: { name, email, password, timezone },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            timezone: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    });

                    return {
                        ...newTrainee,
                        createdAt: formatDateTime(newTrainee.createdAt),
                        updatedAt: formatDateTime(newTrainee.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async GetTrainee(args) {
                try {
                    const { token, traineeId } = args.request;
                    authenticateToken(token);

                    const trainee = await prisma.trainee.findUnique({
                        where: { id: traineeId },
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
                        throw new Error('Trainee not found');
                    }

                    return {
                        ...trainee,
                        createdAt: formatDateTime(trainee.createdAt),
                        updatedAt: formatDateTime(trainee.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async UpdateTrainee(args) {
                try {
                    const { token, traineeId, name, email, password, timezone } = args.request;
                    authenticateToken(token);

                    const updateData = {};
                    if (name !== undefined) updateData.name = name;
                    if (email !== undefined) updateData.email = email;
                    if (password !== undefined) updateData.password = password;
                    if (timezone !== undefined) updateData.timezone = timezone;

                    const updatedTrainee = await prisma.trainee.update({
                        where: { id: traineeId },
                        data: updateData,
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            timezone: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    });

                    return {
                        ...updatedTrainee,
                        createdAt: formatDateTime(updatedTrainee.createdAt),
                        updatedAt: formatDateTime(updatedTrainee.updatedAt)
                    };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Trainee not found');
                    }
                    throw new Error(error.message);
                }
            },

            async DeleteTrainee(args) {
                try {
                    const { token, traineeId } = args.request;
                    authenticateToken(token);

                    await prisma.trainee.delete({
                        where: { id: traineeId }
                    });

                    return { success: true };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Trainee not found');
                    }
                    throw new Error(error.message);
                }
            },

            // Workout Operations
            async ListWorkouts(args) {
                try {
                    const { token } = args.request;
                    authenticateToken(token);

                    const workouts = await prisma.workout.findMany({
                        orderBy: { createdAt: 'desc' }
                    });

                    return {
                        workouts: workouts.map(w => ({
                            ...w,
                            createdAt: formatDateTime(w.createdAt),
                            updatedAt: formatDateTime(w.updatedAt)
                        }))
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async CreateWorkout(args) {
                try {
                    const { token, name, description, color } = args.request;
                    // Convert duration to integer
                    const duration = parseInt(args.request.duration);

                    authenticateToken(token);

                    if (!name || !duration) {
                        throw new Error('Name and duration are required');
                    }

                    const newWorkout = await prisma.workout.create({
                        data: { name, duration, description, color }
                    });

                    return {
                        ...newWorkout,
                        createdAt: formatDateTime(newWorkout.createdAt),
                        updatedAt: formatDateTime(newWorkout.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async GetWorkout(args) {
                try {
                    const { token, workoutId } = args.request;
                    authenticateToken(token);

                    const workout = await prisma.workout.findUnique({
                        where: { id: workoutId }
                    });

                    if (!workout) {
                        throw new Error('Workout not found');
                    }

                    return {
                        ...workout,
                        createdAt: formatDateTime(workout.createdAt),
                        updatedAt: formatDateTime(workout.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async UpdateWorkout(args) {
                try {
                    const { token, workoutId, name, description, color } = args.request;
                    authenticateToken(token);

                    const updateData = {};
                    if (name !== undefined) updateData.name = name;
                    if (args.request.duration !== undefined) updateData.duration = parseInt(args.request.duration);
                    if (description !== undefined) updateData.description = description;
                    if (color !== undefined) updateData.color = color;

                    const updatedWorkout = await prisma.workout.update({
                        where: { id: workoutId },
                        data: updateData
                    });

                    return {
                        ...updatedWorkout,
                        createdAt: formatDateTime(updatedWorkout.createdAt),
                        updatedAt: formatDateTime(updatedWorkout.updatedAt)
                    };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Workout not found');
                    }
                    throw new Error(error.message);
                }
            },

            async DeleteWorkout(args) {
                try {
                    const { token, workoutId } = args.request;
                    authenticateToken(token);

                    await prisma.workout.delete({
                        where: { id: workoutId }
                    });

                    return { success: true };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Workout not found');
                    }
                    throw new Error(error.message);
                }
            },

            // Routine Operations
            async ListRoutines(args) {
                try {
                    const { token, traineeId } = args.request;
                    authenticateToken(token);

                    const whereClause = traineeId ? { userId: traineeId } : {};

                    const routines = await prisma.routine.findMany({
                        where: whereClause,
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    });

                    return {
                        routines: routines.map(r => ({
                            ...r,
                            availability: JSON.parse(r.availability),
                            createdAt: formatDateTime(r.createdAt),
                            updatedAt: formatDateTime(r.updatedAt)
                        }))
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async CreateRoutine(args) {
                try {
                    const { token, userId, availability } = args.request;
                    authenticateToken(token);

                    if (!userId || !availability) {
                        throw new Error('userId and availability are required');
                    }

                    const trainee = await prisma.trainee.findUnique({
                        where: { id: userId }
                    });

                    if (!trainee) {
                        throw new Error('Trainee not found');
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
                                    email: true
                                }
                            }
                        }
                    });

                    return {
                        ...newRoutine,
                        availability: JSON.parse(newRoutine.availability),
                        createdAt: formatDateTime(newRoutine.createdAt),
                        updatedAt: formatDateTime(newRoutine.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async GetTraineeRoutine(args) {
                try {
                    const { token, traineeId } = args.request;
                    authenticateToken(token);

                    const routine = await prisma.routine.findFirst({
                        where: { userId: traineeId },
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    });

                    if (!routine) {
                        throw new Error('Routine not found');
                    }

                    return {
                        ...routine,
                        availability: JSON.parse(routine.availability),
                        createdAt: formatDateTime(routine.createdAt),
                        updatedAt: formatDateTime(routine.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async UpdateTraineeRoutine(args) {
                try {
                    const { token, traineeId, availability } = args.request;
                    authenticateToken(token);

                    if (!availability) {
                        throw new Error('availability is required');
                    }

                    const updatedRoutine = await prisma.routine.updateMany({
                        where: { userId: traineeId },
                        data: {
                            availability: JSON.stringify(availability)
                        }
                    });

                    if (updatedRoutine.count === 0) {
                        throw new Error('Routine not found');
                    }

                    const routine = await prisma.routine.findFirst({
                        where: { userId: traineeId },
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    });

                    return {
                        ...routine,
                        availability: JSON.parse(routine.availability),
                        createdAt: formatDateTime(routine.createdAt),
                        updatedAt: formatDateTime(routine.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async DeleteTraineeRoutine(args) {
                try {
                    const { token, traineeId } = args.request;
                    authenticateToken(token);

                    const deletedRoutine = await prisma.routine.deleteMany({
                        where: { userId: traineeId }
                    });

                    if (deletedRoutine.count === 0) {
                        throw new Error('Routine not found');
                    }

                    return { success: true };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            // Registration Operations
            async ListRegistrations(args) {
                try {
                    const { token } = args.request;
                    authenticateToken(token);

                    const registrations = await prisma.registration.findMany({
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    });

                    return {
                        registrations: registrations.map(r => ({
                            ...r,
                            startTime: formatDateTime(r.startTime),
                            endTime: formatDateTime(r.endTime),
                            createdAt: formatDateTime(r.createdAt),
                            updatedAt: formatDateTime(r.updatedAt)
                        }))
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async CreateRegistration(args) {
                try {
                    const { token, eventId, userId, inviteeEmail, startTime, endTime, status } = args.request;
                    authenticateToken(token);

                    if (!eventId || !userId || !inviteeEmail || !startTime) {
                        throw new Error('eventId, userId, inviteeEmail, and startTime are required');
                    }

                    const trainee = await prisma.trainee.findUnique({
                        where: { id: userId }
                    });

                    if (!trainee) {
                        throw new Error('Trainee not found');
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
                                    email: true
                                }
                            }
                        }
                    });

                    return {
                        ...newRegistration,
                        startTime: formatDateTime(newRegistration.startTime),
                        endTime: formatDateTime(newRegistration.endTime),
                        createdAt: formatDateTime(newRegistration.createdAt),
                        updatedAt: formatDateTime(newRegistration.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async GetRegistration(args) {
                try {
                    const { token, registrationId } = args.request;
                    authenticateToken(token);

                    const registration = await prisma.registration.findUnique({
                        where: { id: registrationId },
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    });

                    if (!registration) {
                        throw new Error('Registration not found');
                    }

                    return {
                        ...registration,
                        startTime: formatDateTime(registration.startTime),
                        endTime: formatDateTime(registration.endTime),
                        createdAt: formatDateTime(registration.createdAt),
                        updatedAt: formatDateTime(registration.updatedAt)
                    };
                } catch (error) {
                    throw new Error(error.message);
                }
            },

            async UpdateRegistration(args) {
                try {
                    const { token, registrationId, eventId, userId, inviteeEmail, startTime, endTime, status } = args.request;
                    authenticateToken(token);

                    const updateData = {};
                    if (eventId !== undefined) updateData.eventId = eventId;
                    if (userId !== undefined) updateData.userId = userId;
                    if (inviteeEmail !== undefined) updateData.inviteeEmail = inviteeEmail;
                    if (startTime !== undefined) updateData.startTime = new Date(startTime);
                    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
                    if (status !== undefined) updateData.status = status;

                    const updatedRegistration = await prisma.registration.update({
                        where: { id: registrationId },
                        data: updateData,
                        include: {
                            trainee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    });

                    return {
                        ...updatedRegistration,
                        startTime: formatDateTime(updatedRegistration.startTime),
                        endTime: formatDateTime(updatedRegistration.endTime),
                        createdAt: formatDateTime(updatedRegistration.createdAt),
                        updatedAt: formatDateTime(updatedRegistration.updatedAt)
                    };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Registration not found');
                    }
                    throw new Error(error.message);
                }
            },

            async DeleteRegistration(args) {
                try {
                    const { token, registrationId } = args.request;
                    authenticateToken(token);

                    await prisma.registration.delete({
                        where: { id: registrationId }
                    });

                    return { success: true };
                } catch (error) {
                    if (error.code === 'P2025') {
                        throw new Error('Registration not found');
                    }
                    throw new Error(error.message);
                }
            }
        }
    }
};

// Read WSDL file
const wsdlPath = path.join(__dirname, '../wsdl/gym-registration.wsdl');
const wsdl = fs.readFileSync(wsdlPath, 'utf8');

// Create SOAP server
app.listen(port, () => {
    console.log(`SOAP Server running on port ${port}`);

    soap.listen(app, '/soap', serviceObject, wsdl, () => {
        console.log(`SOAP service available at http://localhost:${port}/soap`);
        console.log(`WSDL available at http://localhost:${port}/soap?wsdl`);
    });
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