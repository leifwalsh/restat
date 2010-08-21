function dictKeys(d) {
    var keys = [];
    for(var i in d) {
        if (d.hasOwnProperty(i)) {
            keys.push(i);
        }
    }
    return keys;
};

function str_repeat(i, m) {
    for (var o = []; m > 0; o[--m] = i) {}
    return o.join('');
}

function sprintf() {
    var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
    while (f) {
	if ((m = /^[^\x25]+/.exec(f))) {
	    o.push(m[0]);
	}
	else if ((m = /^\x25{2}/.exec(f))) {
	    o.push('%');
	}
	else if ((m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f))) {
	    if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
		throw('Too few arguments.');
	    }
	    if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
		throw('Expecting number but found ' + typeof(a));
	    }
	    switch (m[7]) {
	    case 'b': a = a.toString(2); break;
	    case 'c': a = String.fromCharCode(a); break;
	    case 'd': a = parseInt(a); break;
	    case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
	    case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
	    case 'o': a = a.toString(8); break;
	    case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
	    case 'u': a = Math.abs(a); break;
	    case 'x': a = a.toString(16); break;
	    case 'X': a = a.toString(16).toUpperCase(); break;
	    }
	    a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+'+ a : a);
	    c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
	    x = m[5] - String(a).length - s.length;
	    p = m[5] ? str_repeat(c, x) : '';
	    o.push(s + (m[4] ? a + p : p + a));
	}
	else {
	    throw('Huh ?!');
	}
	f = f.substring(m[0].length);
    }
    return o.join('');
}

function Restat(repos, days) {
    var self = this;

    var today = new Date();
    if (today.getDay() > days - 1) {
        self.cutoff = new Date(today.getYear + 1900, today.getMonth(),
                               today.getDate() - days + 1);
    } else {
        self.cutoff = new Date(today.getYear + 1900, today.getMonth(),
                               today.getDate() - days - 1);
    }

    self.commitsToGet = {};
    self.repos = {};
    self.all = {};
    $.each(repos, function(i, repo) {
               self.repos[repo] = {};
               self.getBranches(repo);
           });
};
Restat.prototype = {
    baseUri: '/cgi-bin/echo.pl',
    githubUri: 'http://github.com/api/v2/json',
    branchUri: '/repos/show/%s/branches',
    commitUri: '/commits/list/%s/%s',

    update: function() {
        var self = this;
        $.each(self.repos, function(i, repo) {
                   self.getBranches(repo);
               });
    },
    getBranches: function(repo) {
        var self = this;
        $.getJSON(
            self.baseURI,
            {'uri': self.githubUri + sprintf(self.branchUri, repo)},
            function(data, textStatus) {
                if (textStatus === 'success' && data !== null) {
                    $.each(dictKeys(data.branches), function(i, branch) {
                               self.repos[repo][branch] = {};
                           });
                    self.commitsToGet[repo] = dictKeys(data.branches);
                    $.each(dictKeys(self.repos[repo]), function(i, branch) {
                               self.getCommits(repo, branch);
                           });
                }
            });
    },
    getCommits: function(repo, branch) {
        var self = this;
        $.getJSON(
            self.baseURI,
            {'uri': self.githubUri + sprintf(self.commitUri, repo, branch)},
            function(data, textStatus) {
                self.filterAndStore(repo, branch, data.commits);
                self.commitsToGet[repo].remove(branch);
                if (self.commitsToGet[repo].length === 0) {
                    self.displayRepo(repo);
                }
            });
    },
    committedDate: function(commit) {
        return new Date(commit.committed_date.replace(/T/, ' ').substr(0, 19));
    },
    filterAndStore: function(repo, branch, commits) {
        var self = this;
        $.each(dictKeys(commits), function(i, id) {
                   if (self.committedDate(commit) >= self.cutoff) {
                       self.storeCommit(repo, branch, id, commit);
                   }
               });
    },
    getName: function(commit) {
        return commit.author.login || commit.author.name ||
            commit.committer.login || commit.committer.name ||
            'unknown';
    },
    storeCommit: function(repo, branch, id, commit) {
        var self = this;

        var name = self.getName(commit);
        if (self.all[name] === undefined) {
            self.all[name] = {};
        }
        if (self.repos[repo][branch][name] === undefined) {
            self.repos[repo][branch][name] = {};
        }
        self.repos[repo][branch][name][id] = self.all[name][id] = commit;
    },
    hashName: function(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = h + s.charCodeAt(i) + 10;
        }
        return h;
    },
    displayRepo: function(repo) {
        var self = this;
        $.each(dictKeys(self.repos[repo]), function(i, branch) {
                   displayCommitterTotals(branch, self.repos[repo][branch], self.all);
               });
    }
};

var branchNum = 0;
function displayCommitterTotals(branch, committer_map, all_branch_map) {
    branchNum++;
    var totalCommits = 0;
    var maxCommits = 0;
    var authors = [];
    $.each(dictKeys(committer_map), function(i, author) {
               authors.push(author);
               var commits = dictKeys(committer_map[author]).length;
               totalCommits += commits;
               if (commits > maxCommits) {
                   maxCommits = commits;
               }
           });
    if (totalCommits > 0) {
        var paper = Raphael('raphael_canvas', 700, 21 * authors.length - 1);
        var text = paper.print(-700, 11 * authors.length, branch, paper.getFont('AurulentSans', 'bold'), 16);
        text.attr('fill', 'hsb(' + (branchNum / numBranches) * 360 + 'deg, 0.5, 0.95)');
        authors.sort(function(a, b) {
                         return dictKeys(committer_map[b]).length - dictKeys(committer_map[a]).length;
                     });
        var drawn = 0;
        var set = paper.set();
        set.push(text);
        var thunks = [];
        $.each(authors, function(i, author) {
                   var commits = dictKeys(committer_map[author]).length;
                   var width = commits * 190 / maxCommits;
                   var num = paper.print(-450, drawn * 22 + 12, sprintf('%4d', commits), paper.getFont('DejaVu', 'bold'), 16);
                   num.attr('fill', 'hsb(' + hash(author) % 360 + 'deg, 0.5, 0.95)');
                   var rect = paper.rect(-400, drawn * 22 + 2, 20, 20, 10);
                   rect.attr('fill', '90-hsb(' + hash(author) % 360 + 'deg, 0.3, 0.4)-hsb(' + hash(author) % 360 + 'deg, 0.6, 0.98)');
                   rect.attr('stroke', '#282828');
                   thunks.push(function() {
                                   rect.animate({'width': width + 10}, 1000, '>');
                                   if (arguments.length > 0) {
                                       arguments[0].call();
                                   }
                               });
                   var text = paper.print(-190, drawn * 22 + 12, author, paper.getFont('AurulentSans', 'bold'), 16);
                   text.attr('fill', 'hsb(' + hash(author) % 360 + 'deg, 0.5, 0.95)');
                   set.push(num, rect, text);
                   drawn++;
               });
        $('#raphael_canvas > svg:hidden')
            .attr('id', branch)
            .show('blind', function() {
                      set.animate({'translation': '700 0'}, 300, 'elastic',
                                  function() {
                                      setTimeout(function() {
                                                     $.each(thunks, function (i, thunk) {
                                                                if (all_branch_map && i === thunks.length - 1) {
                                                                    thunk.call(function() { displayCommitterTotals('all', all_branch_map); });
                                                                } else {
                                                                    thunk.call();
                                                                }
                                                            });
                                                 }, 300);
                                  });
                  });
        //        text.attr('x', 240 - text.attr('width'));
    } else {
        var paper = Raphael('raphael_canvas', 700, 20);
        var text = paper.print(-250, 10, branch, paper.getFont('AurulentSans', 'bold'), 16);
        text.attr('fill', 'hsb(' + (branchNum / numBranches) * 360 + 'deg, 0.5, 0.95)');
        var nothing = paper.print(-250, 10, 'no commits', paper.getFont('AurulentSans', 'bold'), 16);
        nothing.attr('fill', 'hsb(' + (branchNum / numBranches) * 360 + 'deg, 0.5, 0.95)');
        $('#raphael_canvas > svg:hidden')
            .attr('id', branch)
            .show('blind', function() {
                      nothing.animate({'translation': '550 0'}, 300, 'elastic');
                      if (all_branch_map) {
                          text.animate({'translation': '250 0'}, 300, 'elastic', function() { displayCommitterTotals('all', all_branch_map); });
                      } else {
                          text.animate({'translation': '250 0'}, 300, 'elastic');
                      }
                  });
    }
}

$(document).ready(
    function() {
        var keepAnimating = false;
        var animateRight = function() {
            if (keepAnimating) {
                $(this).animate({'left': $(window).width() - 132}, 3000, 'linear', animateLeft);
            }
        }, animateLeft = function() {
            if (keepAnimating) {
                $(this).animate({'left': 0}, 3000, 'linear', animateRight);
            }
        }, startAnimation = function() {
            keepAnimating = true;
            $(this).css('left', '0px').show(0, animateRight);
        }, stopAnimation = function() {
            keepAnimating = false;
            $(this).stop().hide();
        };
        $('#loading').css('top', $('header').height() + 40 - $('#loading').height() / 2)
            .ajaxStart(startAnimation)
            .ajaxStop(stopAnimation);


        var restat = new Restat(['coffeemug/rethinkdb'], 4);
        restat.update();
    });
