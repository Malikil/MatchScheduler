Match Scheduler
===

This is a small helper program I wrote to make scheduling matches for tournaments easier.  
The expectation is that players aren't guaranteed to be in the same time zone, and the available hours for whatever timezone they're in may not overlap with any reliable amount.

When sucessful times are known they can be set in the program, time info is stored in json format in the `times` folder. When looking for a match time you can give the players' UTC offsets to the program and it will check for what times those offsets normally play each other at.

The program supports any number of players, and will condense players with the same timezone into a single value. Ie a 1v1 match between offsets +2 and -7 will be treated the same as a 2v2 match where three players are +2 and one is -7. Or a 3 player free-for-all with offsets +3, -3, and -5 is treated the same as a 3v3 match between (+3, -5, -5) vs (-3, -3, +3)

-----

Right now it only allows one match at a time. So if you're making a schedule for a larger number of matches and want to avoid conflicts you need to adjust the average time yourself, using the given average and deviation as a guideline. Eventually I would like to have it find non-conflicting or minimally conflicting times automatically.

Setting times from multiple matches at a time is currently in the works.