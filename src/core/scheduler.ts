import logger from './logger';

export class Task {

    private name: string;
    private callback: Function;
    private params: any;
    private duedate: number | undefined;
    private timeout: number | undefined;
    private nextCall: number | undefined;

    constructor(name: string, callback: Function, timeout: number | undefined = undefined, duedate: number | undefined = undefined, ...params: any) {

        this.name = name;
        this.callback = callback;
        this.params = params;
        this.duedate = duedate;
        this.timeout = timeout;
        this.nextCall = Date.now();
        if (duedate) {
            this.setDuedate(duedate);
        }
        else if (timeout) {
            this.setTimeout(timeout);
        }
    }

    setDuedate(duedate: number | undefined) {
        if (duedate) logger.info(`[Scheduler] Set duedate for task "${this.name} to ${duedate - Date.now()}ms in the future.`);
        this.duedate = duedate;
        this.nextCall = duedate;
    }

    getDuedate() {
        return this.duedate;
    }

    setTimeout(timeout: number | undefined) {
        if (timeout) logger.info(`[Scheduler] Set timeout for task "${this.name} to ${timeout}ms`);
        this.timeout = timeout;

        if (timeout) this.nextCall = Date.now() + timeout;
        else this.nextCall = undefined;
    }
    getTimeout() {
        return this.timeout;
    }

    getName() {
        return this.name;
    }

    run() {

        if (!this.nextCall) return;

        if (this.timeout && Date.now() >= this.nextCall) {

            logger.info(`[Scheduler] Executed task "${this.name}" and reset timeout to ${this.timeout}ms.`);
            this.callback(this.params);
            this.setTimeout(this.timeout);

        }
        else if (this.duedate && Date.now() >= this.nextCall) {

            logger.info(`[Scheduler] Executed task "${this.name}" and deleted Duedate.`);
            this.callback(this.params);
            this.setDuedate(undefined);
        }
    }
}

const tasks = new Map<string, Task>();

const checkForTasks = () => {

    tasks.forEach((task, name) => {
        task.run();
        if (task.getDuedate() === undefined && task.getTimeout() === undefined) {
            // remove if only onced
            tasks.delete(name);
        }
    });
};

export default async () => {

    setInterval(checkForTasks, 1 * 1000);
};

export const addTask = (task: Task) => {
    tasks.set(task.getName(), task);
    logger.debug(`[Scheduler] Add Task: ${task.getName()} with timestamp: ${task.getDuedate()} and cycle: ${task.getTimeout()}`);
};
