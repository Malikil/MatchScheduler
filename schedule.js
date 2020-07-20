const util = require('util');
const fs = require('fs');
const readline = require('readline');
const cmd = process.argv.slice(2);

/**
 * @param {string[]} times Times, in +n -n format
 */
function validateTimes(times)
{
    console.log(times);
    if (times.length < 1)
        return false;
    return !times.find(/** @param {string} t */ t => {
        // Time should start with a + or -
        if (t[0] !== "+" && t[0] !== "-")
            return false;
        // + is accepted by isNaN(), so the string can be checked for number as-is
        return isNaN(t);
    });
}

/**
 * @param {string[]} times Times array
 */
function fileExists(times)
{
    if (times.length > 0)
        if (!fs.existsSync(`times/count${times.length}.json`))
            fs.writeFileSync(`times/count${times.length}.json`, "{}", (err) => { if (err) console.log(err); });
}

/**
 * 
 * @param {Object} timetable Object as taken directly from count#.json
 * @param {string[]} times Times, in +n -n format, pre-sorted
 * @param {number} time Time of the match. For best results it should be in the range [0, 24)
 */
function set(timetable, times, time)
{
    console.log(`Adding match @ ${time}`);
    obj = timetable;
    // Find the specific object for updating
    for (let i = 0; obj && i < times.length; i++)
        obj = obj[times[i]];
    // Update time
    console.log(`Old time: ${util.inspect(obj)}`);
    if (!obj)
    {
        // If the time doesn't exist, create a new time for the file
        obj = timetable;
        for (let i = 0; i < times.length; i++)
        {
            if (!obj[times[i]])
                obj[times[i]] = {};
            obj = obj[times[i]];
        }
        obj.time = time;
        obj.count = 1;
    }
    else
    {
        // Decide which time mod to use.
        // If negative time is closer than given time, use that.
        // If a time is closer in the negative direction, it won't be closer upwards
        if (Math.abs(obj.time - (time - 24)) < Math.abs(obj.time - time))
            time -= 24;
        else if (Math.abs(obj.time - (time + 24)) < Math.abs(obj.time - time))
            time += 24;
        let newtime = ((obj.time * obj.count) + time) / (obj.count + 1);
        let avetime = (newtime + obj.time) / 2;
        let addtime = (time - avetime) * (time - avetime);
        let varianceSum = (obj.stdev || 0) * (obj.stdev || 0) * (obj.count - 1);
        
        obj.stdev = Math.sqrt((varianceSum + addtime) / obj.count);
        obj.time = (newtime % 24 + 24) % 24;
        obj.count++;
    }

    console.log(`New time: ${util.inspect(obj)}`);
    return timetable;
}

const funcs = {
    get: (times) => {
        // Do validation
        if (!validateTimes(times))
            return console.log("Invalid arguments");
        fileExists(times);
        // Get the time
        times = times.sort((a, b) => a - b);
        var timetable = JSON.parse(fs.readFileSync(`times/count${times.length}.json`));
        var obj = timetable;
        for (let i = 0; obj && i < times.length; i++)
            obj = obj[times[i]];
        if (obj)
            console.log(`Time: ${Math.round(obj.time)} ±${Math.round(obj.stdev)}`);
        else
            console.log("No time available");
        return obj;
    },
    set: (args) => {
        // Split args into times and match time
        let times = args.slice(0, -1).sort((a, b) => a - b);
        let time = parseFloat(args.slice(-1)[0]);
        // Do validation
        if (!validateTimes(times))
            return console.log("Invalid arguments");
        fileExists(times);
        // Set the time
        var timetable = JSON.parse(fs.readFileSync(`times/count${times.length}.json`));
        timetable = set(timetable, times, time);
        fs.writeFile(`times/count${times.length}.json`, JSON.stringify(timetable),
                (err) => { if (err) console.log(err); });
    },
    bulkset: (args) => {
        // The only arg should be a file for reading
        if (!fs.existsSync(args[0]))
            return console.log("File not found");
        
        // Read the file
        const opentable = {
            count: 0,
            table: undefined
        };
        const infile = readline.createInterface({
            input: fs.createReadStream(args[0])
        });
        infile.on("line", line => {
            let lineargs = line.split(' ');
            let times = lineargs.slice(0, -1).sort((a, b) => a - b);
            let time = parseFloat(lineargs.slice(-1));
            if (!validateTimes(times))
                return;
            // Not entirely sure if verifying the file exists here is proper
            fileExists(times);
            // Check if a file needs to be loaded
            if (opentable.count !== times.length)
            {
                // Check if there's currently a timetable that should be saved
                if (opentable.table)
                    fs.writeFileSync(`times/count${opentable.count}.json`, JSON.stringify(opentable.table));
                // Open the appropriate timetable
                opentable.table = JSON.parse(fs.readFileSync(`times/count${times.length}.json`));
                opentable.count = times.length;
            }
            opentable.table = set(opentable.table, times, time);
        });
        infile.on('close', () => {
            // Save the currently open table
            if (opentable.table)
                fs.writeFileSync(`times/count${opentable.count}.json`, JSON.stringify(opentable.table));
        });
    }
}

// Cut out duplicates
let times = [];
cmd.forEach((item, index) => {
    if (index > 0 && !times.includes(item))
        times.push(item);
});

// Run the proper function
if (cmd.length < 2)
    console.log("get <times...>\n    Times should be in \"-5\" or \"+3\" format\n"
            + "set <times...> sched\n    Times in get format,"
            + " sched is an hour number of the scheduled time\n"
            + "bulkset filename\n    Reads match times from a file and sets them."
            + " Format same as set, one match per line");
else
    funcs[cmd[0]](times);
