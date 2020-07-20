const util = require('util');
const fs = require('fs');
const cmd = process.argv.slice(2);
const funcs = {
    get: (times) => {
        times = times.sort((a, b) => a - b);
        var timetable = JSON.parse(fs.readFileSync(`./times/count${times.length}.json`));
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
        let times = args.slice(0, -1).sort((a, b) => a - b);
        let time = parseFloat(args.slice(-1)[0]);
        var timetable = JSON.parse(fs.readFileSync(`./times/count${times.length}.json`));
        var obj = timetable;
        console.log(timetable);
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
        fs.writeFile(`count${times.length}.json`, JSON.stringify(timetable),
                (err) => { if (err) console.log(err); });
    }
}

// Cut out duplicates
let times = [];
cmd.forEach((item, index) => {
    if (index > 0 && !times.includes(item))
        times.push(item);
});

// Data validation
console.log(times);
if (times.find(/** @param {string} t */ t => {
    // Time should start with a + or -
    if (t[0] !== "+" && t[0] !== "-")
        return true;
    // + is accepted by isNaN(), so the string can be checked for number as-is
    return isNaN(t);
})) {
    console.log("Invalid arguments");
    return;
}

// Make sure the file exists
if (times.length > 0)
    if (!fs.existsSync(`times/count${times.length}.json`))
        fs.writeFileSync(`times/count${times.length}.json`, "{}", (err) => { if (err) console.log(err); });


// Run the proper function
if (cmd.length == 0)
    console.log("get <times...>\n    Times should be in \"-5\" or \"+3\" format\n"
            + "set <times...> sched\n    Times in get format,"
            + " sched is an hour number of the scheduled time");
else
    funcs[cmd[0]](times);
