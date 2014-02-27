/*globals $,ReplyBoxHandler,OverlayHandler,EditCommentBoxHandler*/
/* takes care of the hovers for the tree comments, leave a comment link, Reply links in the flat comments, tree
 * and flat comments contents */
var CommentsHandler = {

    referenceCommentId : -1, // the id of the comment that is about to become a parent of the new comment
    subjectTouched: false,
    bodyTouched: false,

    activate : function () {
        'use strict';
        // take care of the relative times in the flat comments as well as the tree comments
        this.populateAgoTimes();
        this.activateReplyLinks();
        this.activateEditLinks();
        this.activateTreeCommentsHover();
        this.activateRootPost();
    },

    showNotificationInput : function () {
        if (CommentsHandler.bodyTouched
                && CommentsHandler.subjectTouched
                && $.trim($('#subject').val()).length !== 0
                && $.trim($('#body').val()).length !== 0) {
            $('.comment_here input').attr('checked', forumNotificationDefault);
            $('.comment_here input[name=emailMe], .comment_here span.tocheck').fadeIn(3000);
        }
    },

    populateAgoTimes : function () {
        'use strict';
        var that = this;
        $('div[id^=ans]').each(function () {
            that.populateAgoTime(this);
            // obtain the corresponding timestamp
        });
    },

    populateAgoTime : function (flatCommentNode) {
        'use strict';
        var commentId,
            agoTime = this.getRelativeTime($('input[name=tmstmp]', flatCommentNode).attr('value'));
        // populate the flat comment relative time
        $('span.bodyRelativeTime', flatCommentNode).text(agoTime);
        // populate the tree comment relative time
        commentId = $(flatCommentNode).attr('id').substring(3);
        commentId = parseInt(commentId);
        $('div#com' + commentId + ' span.treeRelativeTime').text(agoTime);
    },

    activateReplyLinks : function () {
        'use strict';
        var that = this;
        $('a.reply_flat').click(function () {
            that.referenceCommentId = $(this).parents('.answers').first().attr('id').substring(3);
            that.referenceCommentBody = "";
            if($(this).parents('.answers').first().children(".flat_comment_body").length) {
            	that.referenceCommentBody = $(this).parents('.answers').first().children(".flat_comment_body").html();
            }
            that.activateReplyLink($(this).parents('.answers')[0]);
            OverlayHandler.hideCommentOverlay();
        });
    },

    activateReplyLink : function (anchor, postProcCallback) {
        'use strict';
        ReplyBoxHandler.replyBoxAnchor = anchor;
        if (!loggedIn) {
            UserActions_Login.showLoginWidgetRightSide(anchor, 'commentsLogin');
        } else {
            ReplyBoxHandler.showReplyBox(postProcCallback);
        }
    },

    activateRootPost : function () {
        $('.comment_here')
                .hover(function () {
                    if (!loggedIn) {
                        $('#postFormDeck').css('display', 'block');
                    }
                },
                function () {
                    $('#postFormDeck').hide();
                });
        $('#subject').val(JSi18n.enter_subject);
        $('#body').val(JSi18n.enter_message);
        $('#subButton').click(function () {
            if (!loggedIn) {
                UserActions_Login.showLoginWidget(this, 'rootCommentLogin');
            } else {
                CommentsPoster.postRootComment();
            }
        });

        $('#subject,#body').keyup(CommentsHandler.showNotificationInput);
        $('#subject').
                focusin(function() {
                    if (!loggedIn) {
                        $('#postFormDeck').css('display', 'block');
                        return;
                    }
                    if (CommentsHandler.subjectTouched) {
                        return;
                    }
                    CommentsHandler.subjectTouched = true;
                    $(this).val('');
                    $(this).css('color', 'black');
                    $(this).css('font-family', 'Verdana,Geneva,sans-serif');
                    $(this).css('font-size', '13px');
                    $(this).css('font-weight', 'normal');
        });
        $('#body')
                .focusin(function() {
                    if (!loggedIn) {
                        $('#postFormDeck').css('display', 'block');
                        return;
                    }
                    if (CommentsHandler.bodyTouched) {
                        return;
                    } 
                    CommentsHandler.bodyTouched = true;
                    $(this).val('');
                    $(this).css('color', 'black');
                    $(this).css('font-family', 'Verdana,Geneva,sans-serif');
                    $(this).css('font-size', '13px');
                    $(this).css('font-weight', 'normal');
                    $('#body').autosize(); // call this after the font is updated, it only reads font related style properties once
                }).focusin( function() {
                    $('.comment_here p.allowed').fadeIn(3000);
                });
        $('#body').focusout(function() {
            $('.comment_here p.allowed').fadeOut(300);
        });
        $('#postFormDeck a.login').click(function () {
            $('#postFormDeck').css('display', 'block');
            $('div.comment_here').unbind('hover');
            UserActions_Login.showLoginWidget(this, 'postFormDeck');
        });
    },

    deactivateReplyLinks : function () {
        'use strict';
        $('a.reply_flat').unbind('click');
    },

    activateEditLinks : function () {
        'use strict';
        $('div[id^=ans]').each(function () {
            CommentsHandler.activateEditLink(this);
        });
    },

    activateEditLink : function (flatComment) {
        'use strict';
        var that = this,
            editLink = $('ul.help_links>li>a.edit_comment', flatComment)[0];
        // do nothing if the edit link is not available
        if (!editLink) {
            return;
        }
        that.updateCountdownLink(editLink);
        if (editLink) { //might have been deleted as part of the previous method call
            $(editLink).click(function () {
                // the tree comment will need the reference id
                that.referenceCommentId = $(this).parents('.answers').first().attr('id').substring(3);
                EditCommentBoxHandler.clearEditCommentBox();
                EditCommentBoxHandler.prepopulateSubjectAndBody();
                EditCommentBoxHandler.showEditCommentBox($(this).parents('.answers').first());
            });
        }
    },

    updateCountdownLink : function (linkNode) {
        'use strict';
        var parent = $(linkNode).parents('.answers')[0],
            msDelta = new Date().getTime() - parseInt($('input[name=tmstmp]', parent).val()),
            minutesRemaining = commentEditPeriod - Math.floor(msDelta / (1000 * 60));
        if (minutesRemaining <= 0) {
            // remove the edit link from the node
            $(linkNode).parent().remove();
        } else {
            if (minutesRemaining === 1) {
                minutesRemaining = '< 1';
            }
            $(linkNode).text(JSi18n.editLinkFormat.replace(/\$m/, minutesRemaining));
            setTimeout(function () {
                CommentsHandler.updateCountdownLink(linkNode);
            }, 10 * 1000); // 10 seconds error allowed
        }
    },

    deactivateEditLinks : function () {
        'use strict';
        $('ul.help_links>li>a.edit_comment').off('click');
    },

    activateTreeCommentsHover : function () {
        'use strict';
        // register the hovers for all the tree comment elements
        $('div[id^=com]').hoverIntent({
            sensitivity: 1,
            interval: 150,
            over: function () {
                // extract the comment id (also known as message id)
                CommentsHandler.referenceCommentId = $(this).attr('id').substring(3);
                // if rehovered, do nothing
                if (this !== OverlayHandler.lastHovered) {
                    ReplyBoxHandler.hideReplyBox();
                    UserActions_Login.hideLoginWidget();
                    OverlayHandler.lastHovered = this;
                    OverlayHandler.showCommentOverlay();
                }
            },
            out: function () {}
        });
    },

    deactivateTreeCommentsHover : function () {
        'use strict';
        $('div[id^=com]').hoverIntent({
            over: function () {},
            out: function () {}
        });
    },

    getRelativeTime : function (timeInMilliseconds) {
        'use strict';
        // create a new date with the browser locale
        var date = new Date();
        // set the milliseconds to this localized date
        date.setTime(timeInMilliseconds);
        // get the relative time
        moment.lang(InfoQConstants.language);
        var momentDate = moment(date);
        var momentNow = moment();
       
        if(momentNow.diff(momentDate,"days")>=3){
	      	// moment.js needs upper case for date format to work as we have for content.
	      	return momentDate.format(JSi18n.content_datetime_format.toUpperCase()+" hh:mm");
        }else{
        	return momentDate.fromNow();
        }        
    },

    clearRootPostBox : function () {
        $('#subject').val('');
        $('#body').val('');
        $('.comment_here input[name=emailMe], .comment_here span.tocheck').hide();
        CommentsHandler.bodyTouched = false;
        CommentsHandler.subjectTouched = false;
    },
    
    quoteOriginalMessage : function() {
    	if(this.referenceCommentBody && this.referenceCommentBody != "") {
    		$('textarea.commentsReply').val($('textarea.commentsReply').val() + "<blockquote>" + $.trim(this.referenceCommentBody) + "</blockquote>");
    	}
    	
    }
};

$(function () {
    'use strict';
    CommentsHandler.activate();
    // activate number of comments
    $('span.author_general').append($('#noOfComments'));
    $('#noOfComments').show();
});/*globals $,ReplyBoxHandler,OverlayHandler,CommentsHandler,PageNotifier*/

/* takes care of the comments posting functionality: form validation, result processing*/
var CommentsPoster = {
    postComment : function () {
        'use strict';
        var replyBox = $('#replyPopup'),
            subject = $('.subject', replyBox).val(), // new comment subject
            body = Parser.fixTags($('textarea.commentsReply', replyBox).val()), // new comment body
            notification = $('.emailMe', replyBox).is(':checked'); // email me checkbox

        // make sure valid data is submitted, do nothing otherwise
        if ($.trim(subject).length === 0) {
            PageNotifier.showNotificationPopup(JSi18n.errorSubject, CommentsPoster.redrawOverlayAndReplyBox);
            return;
        }
        if ($.trim(body).length === 0) {
			PageNotifier.showNotificationPopup(JSi18n.errorBody, CommentsPoster.redrawOverlayAndReplyBox);
			return;
        }

        CommentsPoster.sendRequest(postAddress, subject, body, notification, CommentsHandler.referenceCommentId, CommentsPoster.handleResponse);
    },

    postRootComment : function () {
        var notification = $('div.comment_here input.emailMe[name=emailMe]').is(':checked'),
            subject = $('#subject').val(),
            body = $('#body').val();

        // validation
        if (!CommentsHandler.subjectTouched || $.trim(subject).length === 0) {
            PageNotifier.showNotificationPopup(JSi18n.errorSubject);
            return;
        }
        if (!CommentsHandler.bodyTouched || $.trim(body).length === 0) {
			PageNotifier.showNotificationPopup(JSi18n.errorBody);
			return;
        }

        CommentsPoster.sendRequest(postAddress, subject, body, notification, -1, CommentsPoster.handleResponse);
    },

    repostComment : function () {
        'use strict';
        var editCommentBox = $('#editCommentPopup'),
            subject = $('.subject', editCommentBox).val(), // comment subject
            body = Parser.fixTags($('textarea.commentsReply', editCommentBox).val()), // comment body
            notification = $('.emailMe', editCommentBox).is(':checked'); // email me checkbox

        // make sure valid data is submitted, do nothing otherwise
        if ($.trim(subject).length === 0) {
            PageNotifier.showNotificationPopup(JSi18n.errorSubject, CommentsPoster.redrawEditBox);
            return;
        }
        if ($.trim(body).length === 0) {
			PageNotifier.showNotificationPopup(JSi18n.errorBody, CommentsPoster.redrawEditBox);
			return;
        }
        CommentsPoster.sendRequest(repostAddress, subject, body, notification, CommentsHandler.referenceCommentId, CommentsPoster.handleRepostResponse);
    },

    sendRequest : function (address, subject, body, notification, parentMessageId, responseCallback) {
        $.ajax({
			url: address,
			contentType: "application/x-www-form-urlencoded; charset=UTF-8",
			type: 'POST',
            data: {
                'reply' : 'true',
                'forumID' : forumID,
                'threadID' : threadID,
                'messageID' : parentMessageId,
                'subject' : subject,
                'notification' : notification, // email me checkbox
                'contentUrl' : document.location.href,
                'body' : body
            },
            success: responseCallback,
			error: function () {
                PageNotifier.showNotificationPopup(JSi18n.error);
            }
		});
    },

    redrawOverlayAndReplyBox : function () {
        'use strict';
        if (OverlayHandler.lastHovered) {
            OverlayHandler.showCommentOverlay();
        }
        ReplyBoxHandler.showReplyBox();
    },

    redrawEditBox : function () {
        EditCommentBoxHandler.showEditCommentBox(ReplyBoxHandler.replyBoxAnchor);
    },

    handleResponse : function (response) {
        'use strict';
        var newFlatComment,
            newTreeComment,
            level, // indentation level
            parentComment,
            nextSiblings,
            stopSibling, // the sibling that the new node is to be inserted before
            i; // iterator

        if ($.trim(response).substring(0, 6) === 'error:') {
            if (response.indexOf('Message contains invalid links') !== -1) {
                ReplyBoxHandler.showErrorMessage(JSi18n.errorInvalidLinks);
            } else if (response.indexOf('only guest user available, no logged in business user') !== -1) {
                loggedIn = false;
                PageNotifier.showNotificationPopup('[i18lize]Your session expired. Please log in and resubmit', ReplyBoxHandler.inviteToSignIn);
            } else {
                PageNotifier.showNotificationPopup(response.substring(6, response.length));
            }
        } else {
            $('#responseContent').html(response); // put the content of the response in the page, so that the next expression works for IE8
            newFlatComment = $('div[id^=ans]', $('#responseContent'));
            // add the new comment to the flat comments area
            $('div.all_comments').append(newFlatComment);
            $('a.reply_flat', newFlatComment).click(function () {
                CommentsHandler.referenceCommentId = $(this).parents('.answers').first().attr('id').substring(3);
                CommentsHandler.referenceCommentBody = "";
                if($(this).parents('.answers').first().children(".flat_comment_body").length) {
                	CommentsHandler.referenceCommentBody = $(this).parents('.answers').first().children(".flat_comment_body").html();
                }
                CommentsHandler.activateReplyLink(newFlatComment);
            });

            // add it to the tree
            newTreeComment = $('div[id^=com]', $('#responseContent'));
            parentComment = $('#com' + CommentsHandler.referenceCommentId)[0];
            if (parentComment) {
                // The 'parent' and 'child' notions are purely tree concepts.
                // Technically all the nodes are siblings, having different indentation levels, e.g. css class lvl7.
                // When adding a child, take the parent node, look up the next technical siblings, find out the first technical sibling
                // which has the same level, or a smaller lavel. If found, put the new tree coment before that sibiling
                level = CommentsPoster.findNodeLevel(parentComment);
                nextSiblings = $(parentComment).nextAll();

                for (i = 0; i < nextSiblings.length; i++) {
                    if (CommentsPoster.findNodeLevel(nextSiblings[i]) <= level) {
                        stopSibling = nextSiblings[i];
                        break;
                    }
                }

                if (stopSibling) {
                    // put it just before the parent's next same-level sibling (if available)
                    $(stopSibling).before(newTreeComment);
                } else {
                    // parent's next same level sibling not available, put it in to the global tail
                    $('div.comments').append(newTreeComment);
                }
            } else {
                // it's a 'leave a comment' one; there's no parent, put it in the tail of the tree
                $('div.comments').append(newTreeComment);
            }
            CommentsHandler.populateAgoTime(newFlatComment);
            CommentsHandler.activateEditLink(newFlatComment);
            
            OverlayHandler.hideCommentOverlay();
            ReplyBoxHandler.hideReplyBox();
            ReplyBoxHandler.clearReplyBox();
            CommentsHandler.clearRootPostBox();

            // scroll to the new flat comment
            $(window).scrollTop($(newFlatComment).offset().top);
        }
    },

    handleRepostResponse : function (response) {
        'use strict';
        var newContentFlat,
            oldContentFlat = $('#ans' + CommentsHandler.referenceCommentId),
            editedTreeComment;
        if ($.trim(response).substring(0, 6) === 'error:') {
            if (response.indexOf('Message contains invalid links') !== -1) {
                EditCommentBoxHandler.showErrorMessage(JSi18n.errorInvalidLinks);
            } else if (response.indexOf('You are not allowed to edit this message.') !== -1) {
                PageNotifier.showNotificationPopup(JSi18n.timeExpiredMessage);
            }  else if (response.indexOf('only guest user available, no logged in business user') !== -1) {
                loggedIn = false;
                PageNotifier.showNotificationPopup(JSi18n.sessionExpiredMessage, ReplyBoxHandler.inviteToSignIn);
            } else {
                PageNotifier.showNotificationPopup(response.substring(6, response.length));
            }
        } else {
            // update existing flat comment
            $('#responseContent').html(response);
            newContentFlat = $('div[id^=ans]', $('#responseContent'));
            $(oldContentFlat).html($(newContentFlat).html());
            // update existing tree comment
            editedTreeComment = $('div[id^=com]', $('#responseContent'));
            $('#com' + CommentsHandler.referenceCommentId).html($(editedTreeComment).html());
            CommentsHandler.populateAgoTime(oldContentFlat);
            CommentsHandler.activateEditLink(oldContentFlat);
            // scroll to the new flat comment
            $(window).scrollTop($(oldContentFlat).offset().top);
            EditCommentBoxHandler.hideEditCommentBox();
        }
    },

    findNodeLevel : function (node) {
        'use strict';
        var classArray = $(node).attr('class').split(/\s+/),
            level,
            i;
        for (i = 0; i < classArray.length; i++) {
            if (classArray[i].substring(0, 3) === 'lvl') {
                level = classArray[i].substring(3);
                break;
            }
        }
        return level;
    }
};/*globals $,ReplyBoxHandler,CommentsHandler*/

/*takes care of the box used to reedit the contens of previously edited comments */
var EditCommentBoxHandler = {
    activate : function () {
        'use strict';
        var that = this,
            editCommentBox = $('#editCommentPopup');
        $('a.close_login_popup', editCommentBox).click(that.hideEditCommentBox);
        $('input.reset-reply', editCommentBox).click(that.hideEditCommentBox);
        // activate repost button
        $('#resubmit-reply').click(CommentsPoster.repostComment);
    },

    clearEditCommentBox : function () {
        'use strict';
        var editCommentBox = $('#editCommentPopup');
        // clear subject and body
        $('input[name=subject]', editCommentBox).val('');
        $('textarea.commentsReply', editCommentBox).val('');
        // hide invalid link error
        $('p.allowed.error', editCommentBox).css('display', 'none');
        // hide time expired error
        $('p.allowed.time_expired', editCommentBox).css('display', 'none');
        // enable the button
        $('#resubmit-reply', editCommentBox).removeAttr('disabled').removeClass('disabled');
    },

    showEditCommentBox : function (anchor) {
        'use strict';
        var that = this,
            editCommentBox = $('#editCommentPopup');
        // do nothing if the edit link is clicked again
        if (anchor === ReplyBoxHandler.replyBoxAnchor) {
            return;
        }
        ReplyBoxHandler.replyBoxAnchor = anchor;
        // referenceCommentId is the id of the comment relative to which the new comment will be inserted in the tree.
        // there is one method that tampers with the referenceCommentId - overlayHandler.showCommentOverlay
        // if the referenceCommentId is changed at this moment, the new node will be misplaced in the tree.
        // disable the hovers until the new node is placed in the tree and and activate them again when done
        CommentsHandler.deactivateTreeCommentsHover();
        CommentsHandler.deactivateReplyLinks();
        // solve Repost button text to update
        that.updateCountdownButton();
        // solve positioning
        $(editCommentBox).css('top', $(anchor).position().top
            + $(anchor).outerHeight(true));
        $(editCommentBox).css('left', $(anchor).position().left);
        $(editCommentBox).css('display', 'block');
    },

    updateCountdownButton : function () {
        'use strict';
        var myCommentId = CommentsHandler.referenceCommentId,
            creationTime = parseInt($('#ans' + CommentsHandler.referenceCommentId + ' input[name=tmstmp]').val()),
            button = $('#editCommentPopup #resubmit-reply');

        (function updateButtonText() {
            var msDelta = new Date().getTime() - creationTime,
                secondsRemaining = 60 * commentEditPeriod - Math.floor(msDelta / 1000);
            // if the reference comment id changed (another edit link was clicked, abort update
            if (myCommentId !== CommentsHandler.referenceCommentId) {
                return;
            }
            if (secondsRemaining < 0) {
                $(button).addClass('disabled').attr('disabled', 'disabled').val(JSi18n.timeExpiredButton);
                EditCommentBoxHandler.showTimeExpiredMessage(JSi18n.timeExpiredMessage);
            } else if (secondsRemaining <= 60) {
                $(button).val(JSi18n.repostButtonFormat.replace(/\$m/, secondsRemaining + 's'));
                setTimeout(updateButtonText, 1000);
            } else {
                $(button).val(JSi18n.repostButtonFormat.replace(/\$m/, Math.ceil(secondsRemaining / 60) + 'm'));
                if (secondsRemaining < 70) {
                    setTimeout(updateButtonText, 1000);
                } else {
                    setTimeout(updateButtonText, 10 * 1000);
                }
            }
        }());
    },

    hideEditCommentBox : function () {
        'use strict';
        CommentsHandler.activateTreeCommentsHover();
        CommentsHandler.activateReplyLinks();
        $('#editCommentPopup').hide();
    },

    prepopulateSubjectAndBody : function () {
        'use strict';
        var editCommentBox = $('#editCommentPopup'),
            corrFlatComment = $('#ans' + CommentsHandler.referenceCommentId),
            isNotificationEnabled = $('input[name=isNotificationOn]', corrFlatComment).val() === 'true';
        $('input[name=subject]', editCommentBox).val($('b.title', corrFlatComment).text());
        $('textarea.commentsReply', editCommentBox).val($.trim($('.flat_comment_body', corrFlatComment).html()).replace(/<br>/g, '\n'));

        $('input[name=emailMe]', editCommentBox).attr('checked', isNotificationEnabled);
    },

    showErrorMessage : function (errorMessage) {
        'use strict';
        $('p.error.allowed', $('#editCommentPopup')).css('display', 'inline').text(errorMessage);
        setTimeout(EditCommentBoxHandler.hideErrorMessage, 3000);
    },

    hideErrorMessage : function () {
        'use strict';
        $('#editCommentPopup p.error.allowed').css('display', 'none').text('');
    },

    showTimeExpiredMessage : function (errorMessage) {
        'use strict';
        $('#editCommentPopup p.time_expired.allowed').css('display', 'block').text(errorMessage);
    },

    hideTimeExpiredMessage : function () {
        'use strict';
        $('p.time_expired.allowed', $('#editCommentPopup')).css('display', 'none').text('');
    }
};

$(function () {
    'use strict';
    EditCommentBoxHandler.activate();
});/*globals $,ReplyBoxHandler,CommentsHandler./

/* takes care of the overlay UI triggered when a tree comment is hovered */
var OverlayHandler = {
    /* when the showCommentOverlay method is triggered only the overlay is shown, no Reply box or Login box.
    this method can be triggered more than once for the same element. The second time it will hide everything but
    the overlay. In order to prevent that, we check whether the hover is for that same element.*/
    lastHovered : null,

    activate : function () {
        'use strict';
        this.activateClose();
        this.activateReplyLink();
    },
    // register overlay close event
    activateClose : function () {
        'use strict';
        var that = this;
        $('#overlay_comments>a.close_comment').click(function () {
            that.hideCommentOverlay();
            ReplyBoxHandler.hideReplyBox();
        });
    },

    // associate reply links to either login or reply box
    activateReplyLink : function () {
        'use strict';
        var overlay = $('#overlay_comments');
        $('a.reply', overlay).click(function () {
            CommentsHandler.activateReplyLink(overlay);
        });
    },

    showCommentOverlay : function () {
        'use strict';

        var overlay = $('#overlay_comments'); // the overlay to be popped up

        OverlayHandler.moveData();
        OverlayHandler.configureViewLink();

        // position
        $(overlay).css('top', $(OverlayHandler.lastHovered).position().top + 'px')
            .css('left', $(OverlayHandler.lastHovered).offset().left - $('div.comments').offset().left + 200 + 'px');

        // and show
        $(overlay).css('display', 'block');
    },

    hideCommentOverlay : function () {
        'use strict';
        $('#overlay_comments').hide();
    },

    // data taken from the flat comment area and used to populate the corresponding tree comment overlay
    moveData : function () {
        'use strict';
        var corrFlatNode = $('#ans' + CommentsHandler.referenceCommentId),
            overlay = $('#overlay_comments'), // the overlay to be popped up
            title,
            author,
            body,
            timepast,
            postedOn;
        title = $('b', corrFlatNode).first().text();
        author = $('q', corrFlatNode).text();
        body = $('.flat_comment_body', corrFlatNode).html();
        timepast = $('span.bodyRelativeTime', corrFlatNode).text();
        postedOn = $('input[name=createdOn]', corrFlatNode).val();

        // populate with relevant data
        $('h4>strong', overlay).text(title);
        $('span#author', overlay).text(author);
        $('p#body', overlay).html(body);
        $('span#timepast').text(timepast);
        $('div.alt span', overlay).text(postedOn);
    },

    configureViewLink : function () {
        'use strict';
        $('#overlay_comments .view').attr('href', '#anch' + CommentsHandler.referenceCommentId);
    }
};

$(function () {
    'use strict';
    OverlayHandler.activate();
});/*globals $,ReplyBoxHandler,OverlayHandler,CommentsHandler./

/* substitute for the alert modal windows*/
var PageNotifier = {
    callbackOnClose : null,
    activate : function () {
        'use strict';
        var that = this;
        $('#messagePopup a.close_login_popup,#messagePopup .reset-reply').click(that.hideNotificationPopup);
    },

    showNotificationPopup : function (message, callbackOnClose) {
        'use strict';
        this.callbackOnClose = callbackOnClose;
        var messagePopup = $('#messagePopup'),
            scrollTop = $(window).scrollTop();
        $('p.allowed', messagePopup).text(message);
        // position
        if (ReplyBoxHandler.replyBoxAnchor) {
            $(messagePopup).css('top', $(ReplyBoxHandler.replyBoxAnchor).position().top
                + $(ReplyBoxHandler.replyBoxAnchor).outerHeight(true));
            $(messagePopup).css('left', $(ReplyBoxHandler.replyBoxAnchor).position().left);
        } else {
            $(messagePopup).css('top', $(window).scrollTop());
        }
        // and show
        $('#messagePopup').css('display', 'block');
        OverlayHandler.hideCommentOverlay();
        ReplyBoxHandler.hideReplyBox();
        EditCommentBoxHandler.hideEditCommentBox();
        CommentsHandler.deactivateTreeCommentsHover();
        CommentsHandler.deactivateReplyLinks();
        // disable page scrolling
        if (scrollTop > $(messagePopup).offset().top) {
            scrollTop = $(messagePopup).offset().top - $(window).height() / 2;
        }
        $('body,html').css('overflow', 'hidden').scrollTop(scrollTop);
    },

    hideNotificationPopup : function () {
        'use strict';
        var scrollTop = $(window).scrollTop();
        $('#messagePopup').hide();
        CommentsHandler.activateTreeCommentsHover();
        CommentsHandler.activateReplyLinks();
        // re-enable page scrolling
        $('body,html').css('overflow', 'auto').scrollTop(scrollTop);
        if (PageNotifier.callbackOnClose) {
            PageNotifier.callbackOnClose.call();
        }
    }
};

$(function () {
    'use strict';
    PageNotifier.activate();
});/*when user submits html content, only some tags allowed, the rest escaped */
var Parser = {
    fixTags : function (text) {
        'use strict';
        var tagStack = [],
            output = [],
            openTag = false,
            closeTag = false,
            tagChars = [],
            length = text.length,
            tagName,
            ch = '',
            i, // iterator
            fullTagName,
            alreadyClosed,
            spaceIdx,
            lowerCaseTagName,
            lastEl,
            tag;
        for (i = 0; i < length; i++) {
            ch = text.charAt(i);
            if (((ch >= 'a') && (ch <= 'z')) || ((ch >= 'A') && (ch <= 'Z'))) {
                if (openTag || closeTag) {
                    tagChars.push(ch);
                } else {
                    output.push(ch);
                }
                continue;
            }
            if (ch === '<') {
                if (openTag || closeTag) { // flush the accumulated chars as this is possibly a tag opener
                    output.push(tagChars.join(""));
                    tagChars = [];
                }
                if (i + 2 < length && text.charAt(i + 1) !== " ") {
                    if (text.charAt(i + 1) === "/") {
                        i++;
                        if (i + 2 < length && text.charAt(i + 1) !== " ") {
                            closeTag = true;
                            tagChars.push("</");
                        } else {
                            output.push("</");
                        }
                    } else {
                        openTag = true;
                        tagChars.push("<");
                    }
                } else {
                    output.push(ch);
                }
                continue;
            }
            if (ch === '>') {
                if (openTag) {
                    // found a tag
                    fullTagName = tagChars.join("");
                    alreadyClosed = false;
                    if ("/" === text.charAt(i - 1)) {
                        // see if it is already closed
                        fullTagName = fullTagName.substring(0, fullTagName.length - 1);
                        alreadyClosed = true;
                    }
                    spaceIdx = fullTagName.indexOf(" ");
                    if (spaceIdx === -1) { // tag name only
                        tagName = fullTagName.substring(1);
                    } else { // tag with attributes
                        tagName = fullTagName.substring(1, spaceIdx);
                    }
                    lowerCaseTagName = tagName.toLowerCase();
                    if (alreadyClosed) {
                        output.push(fullTagName + "/>");
                    } else if ("br" === lowerCaseTagName) {
                        // br doesn't need a closing tag
                        output.push("<br/>");
                    } else {
                        tagStack.push(tagName.toLowerCase());
                        output.push(fullTagName + ">");
                    }
                    tagChars = [];
                    openTag = false;
                } else if (closeTag) {
                    // found close tag
                    tagName = tagChars.join("").substring(2);
                    tagChars = [];
                    closeTag = false;
                    // check if the tag is in the stack
                    if (tagStack.length > 0) {
                        lastEl = tagStack[tagStack.length - 1];
                        if (lastEl === tagName.toLowerCase()) {
                            tagStack.pop();
                        } else if ("br" !== tagName) {
                            output.push("<" + tagName + ">");
                        }
                    } else if ("br" !== tagName) {
                        output.push("<" + tagName + ">");
                    }
                    if ("br" === tagName) {
                        output.push("<br/>");
                    } else {
                        output.push("</" + tagName + ">");
                    }
                } else {
                    output.push(ch);
                }
                continue;
            }
            if (openTag) {
                tagChars.push(ch);
            } else if (closeTag) { // close tags do not allow attribute
                closeTag = false;
                output.push(tagChars.join(""));
                tagChars = [];
            } else {
                output.push(ch);
            }
        }
        if (tagChars.length > 0) {
            output.push(tagChars.join(""));
        }
        while (tagStack.length > 0) {
            tag = tagStack.pop();
            output.push("</" + tag + ">");
        }
        return output.join("");
    }
};/*global $,CommentsHandler.CommentsPoster./
/* takes care of reply box UI */
var ReplyBoxHandler = {

    replyBoxAnchor : null, // in case reply link is clicked, the reply box will be positioned relative to this element

    activate : function () {
        'use strict';
        this.activateClose();
        this.activatePostButton();
        this.activateCancelButton();
    },

    // register the reply box close event
    activateClose : function () {
        'use strict';
        var that = this;
        $('#replyPopup>a.close_login_popup').click(function () {
            that.hideReplyBox();
        });
    },

    activatePostButton : function () {
        'use strict';
        $('#submit-reply').click(CommentsPoster.postComment);
    },

    activateCancelButton : function () {
        'use strict';
        var that = this;
        $('input.reset-reply', $('#replyPopup')).click(function () {
            that.hideErrorMessage();
            that.hideReplyBox();
        });
    },

    showReplyBox : function (postProcCallback) {
        'use strict';
        var that = this,
            replyBox = $('#replyPopup');
        // referenceCommentId is the id of the comment relative to which the new comment will be inserted in the tree.
        // there is one method that tampers with the referenceCommentId - overlayHandler.showCommentOverlay
        // if the referenceCommentId is changed at this moment, the new node will be misplaced in the tree.
        // disable the hovers until the new node is placed in the tree and and activate them again when done
        CommentsHandler.deactivateTreeCommentsHover();
        CommentsHandler.deactivateEditLinks();

        // solve positioning
        $(replyBox).css('top', $(that.replyBoxAnchor).position().top + $(that.replyBoxAnchor).outerHeight(true));
        $(replyBox).css('left', $(that.replyBoxAnchor).position().left);
        $(replyBox).css('display', 'block');
        // construct the subject if it's a reply. Don't if the comment originates in 'leave a comment'
        if (CommentsHandler.referenceCommentId > 0) {
            $('.subject', replyBox).val(that.computedSubject());
            $('.subject', replyBox).select();
        }
        $('#emailMe').attr('checked', forumNotificationDefault);
        if (postProcCallback) {
            postProcCallback.call();
        }
    },

    hideReplyBox : function () {
        'use strict';
        $('#replyPopup').hide();
        // reactivate hover efect on tree comments
        CommentsHandler.activateTreeCommentsHover();
        CommentsHandler.activateEditLinks();
    },

    clearReplyBox : function () {
        'use strict';
        var replyBox = $('#replyPopup');
        $('.subject', replyBox).val('');
        $('textarea.commentsReply', replyBox).val('');
        this.hideErrorMessage();
    },

    focusOnSubject : function () {
        'use strict';
        var replyBox = $('#replyPopup');
        $('.subject', replyBox).focus();
    },

    computedSubject : function () {
        'use strict';
        var corrFlatComment = $('#ans' + CommentsHandler.referenceCommentId).first(),
            result = $('b.title', corrFlatComment).text();
        // escape quotes from the original subject
        result = escapeQuotes(result);
        // append a Re: in front, only if it's not already starting with it
        if (result.substring(0, JSi18n.re.length) !== JSi18n.re) {
            result = JSi18n.re + ' ' + result;
        }
        // trim the subject to 75 characters
        if (result.length > 75) {
            result = result.substring(0, 75);
        }
        return result;
    },

    showErrorMessage : function (errorMessage) {
        'use strict';
        $('p.error.allowed', $('#replyPopup')).css('display', 'inline').text(errorMessage);
        setTimeout(ReplyBoxHandler.hideErrorMessage, 3000);
    },

    hideErrorMessage : function () {
        'use strict';
        $('p.error.allowed', $('#replyPopup')).css('display', 'none').text('');
    },

    inviteToSignIn: function() {
        ReplyBoxHandler.showReplyBox();
        UserActions_Login.showLoginWidgetRightSide($('#replyPopup'), 'replyBoxLogin');
    }
};

$(function () {
    'use strict';
    ReplyBoxHandler.activate();
});/*global $,PageNotifier*/

/* takes care of the watch thread/unwatch thread functionality */
var watcher = {
    activate : function () {
        'use strict';
        this.setLinkText();
        this.activateLink();
    },

    setLinkText : function () {
        'use strict';
        try{
	        if (threadWatched) {
	            $('#watch>a').text(JSi18n.stopWatchText);
	        } else {
	            $('#watch>a').text(JSi18n.startWatchText);
	        }
        }catch(err){}

    },

    watchThread : function() {
    	$.ajax({
            url: threadWatched ? postRemoveWatches : postAddWatches,
            type: 'POST',
            data: {
                'forumID': forumID,
                'threadID': threadID
            },
            complete: function (e) {
                if (e.status === 200) {
                    threadWatched = !threadWatched;
                    watcher.setLinkText();
                } else if (e.status === 401) {
                    UserActions_Login.showLoginWidget($('#watch>a'), 'watchForumThread');
                } else {
                    PageNotifier.showNotificationPopup(JSi18n.error); // reasonable fallback
                }
            }
        });
    },
    
    activateLink : function () {
        'use strict';
        $('#watch>a').click(function () {
           watcher.watchThread(); 
        });
    }
};

$(function () {
    'use strict';
    watcher.activate();
});// moment.js
// version : 2.1.0
// author : Tim Wood
// license : MIT
// momentjs.com
!function(t){function e(t,e){return function(n){return u(t.call(this,n),e)}}function n(t,e){return function(n){return this.lang().ordinal(t.call(this,n),e)}}function s(){}function i(t){a(this,t)}function r(t){var e=t.years||t.year||t.y||0,n=t.months||t.month||t.M||0,s=t.weeks||t.week||t.w||0,i=t.days||t.day||t.d||0,r=t.hours||t.hour||t.h||0,a=t.minutes||t.minute||t.m||0,o=t.seconds||t.second||t.s||0,u=t.milliseconds||t.millisecond||t.ms||0;this._input=t,this._milliseconds=u+1e3*o+6e4*a+36e5*r,this._days=i+7*s,this._months=n+12*e,this._data={},this._bubble()}function a(t,e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t}function o(t){return 0>t?Math.ceil(t):Math.floor(t)}function u(t,e){for(var n=t+"";n.length<e;)n="0"+n;return n}function h(t,e,n,s){var i,r,a=e._milliseconds,o=e._days,u=e._months;a&&t._d.setTime(+t._d+a*n),(o||u)&&(i=t.minute(),r=t.hour()),o&&t.date(t.date()+o*n),u&&t.month(t.month()+u*n),a&&!s&&H.updateOffset(t),(o||u)&&(t.minute(i),t.hour(r))}function d(t){return"[object Array]"===Object.prototype.toString.call(t)}function c(t,e){var n,s=Math.min(t.length,e.length),i=Math.abs(t.length-e.length),r=0;for(n=0;s>n;n++)~~t[n]!==~~e[n]&&r++;return r+i}function f(t){return t?ie[t]||t.toLowerCase().replace(/(.)s$/,"$1"):t}function l(t,e){return e.abbr=t,x[t]||(x[t]=new s),x[t].set(e),x[t]}function _(t){if(!t)return H.fn._lang;if(!x[t]&&A)try{require("./lang/"+t)}catch(e){return H.fn._lang}return x[t]}function m(t){return t.match(/\[.*\]/)?t.replace(/^\[|\]$/g,""):t.replace(/\\/g,"")}function y(t){var e,n,s=t.match(E);for(e=0,n=s.length;n>e;e++)s[e]=ue[s[e]]?ue[s[e]]:m(s[e]);return function(i){var r="";for(e=0;n>e;e++)r+=s[e]instanceof Function?s[e].call(i,t):s[e];return r}}function M(t,e){function n(e){return t.lang().longDateFormat(e)||e}for(var s=5;s--&&N.test(e);)e=e.replace(N,n);return re[e]||(re[e]=y(e)),re[e](t)}function g(t,e){switch(t){case"DDDD":return V;case"YYYY":return X;case"YYYYY":return $;case"S":case"SS":case"SSS":case"DDD":return I;case"MMM":case"MMMM":case"dd":case"ddd":case"dddd":return R;case"a":case"A":return _(e._l)._meridiemParse;case"X":return B;case"Z":case"ZZ":return j;case"T":return q;case"MM":case"DD":case"YY":case"HH":case"hh":case"mm":case"ss":case"M":case"D":case"d":case"H":case"h":case"m":case"s":return J;default:return new RegExp(t.replace("\\",""))}}function p(t){var e=(j.exec(t)||[])[0],n=(e+"").match(ee)||["-",0,0],s=+(60*n[1])+~~n[2];return"+"===n[0]?-s:s}function D(t,e,n){var s,i=n._a;switch(t){case"M":case"MM":i[1]=null==e?0:~~e-1;break;case"MMM":case"MMMM":s=_(n._l).monthsParse(e),null!=s?i[1]=s:n._isValid=!1;break;case"D":case"DD":case"DDD":case"DDDD":null!=e&&(i[2]=~~e);break;case"YY":i[0]=~~e+(~~e>68?1900:2e3);break;case"YYYY":case"YYYYY":i[0]=~~e;break;case"a":case"A":n._isPm=_(n._l).isPM(e);break;case"H":case"HH":case"h":case"hh":i[3]=~~e;break;case"m":case"mm":i[4]=~~e;break;case"s":case"ss":i[5]=~~e;break;case"S":case"SS":case"SSS":i[6]=~~(1e3*("0."+e));break;case"X":n._d=new Date(1e3*parseFloat(e));break;case"Z":case"ZZ":n._useUTC=!0,n._tzm=p(e)}null==e&&(n._isValid=!1)}function Y(t){var e,n,s=[];if(!t._d){for(e=0;7>e;e++)t._a[e]=s[e]=null==t._a[e]?2===e?1:0:t._a[e];s[3]+=~~((t._tzm||0)/60),s[4]+=~~((t._tzm||0)%60),n=new Date(0),t._useUTC?(n.setUTCFullYear(s[0],s[1],s[2]),n.setUTCHours(s[3],s[4],s[5],s[6])):(n.setFullYear(s[0],s[1],s[2]),n.setHours(s[3],s[4],s[5],s[6])),t._d=n}}function w(t){var e,n,s=t._f.match(E),i=t._i;for(t._a=[],e=0;e<s.length;e++)n=(g(s[e],t).exec(i)||[])[0],n&&(i=i.slice(i.indexOf(n)+n.length)),ue[s[e]]&&D(s[e],n,t);i&&(t._il=i),t._isPm&&t._a[3]<12&&(t._a[3]+=12),t._isPm===!1&&12===t._a[3]&&(t._a[3]=0),Y(t)}function k(t){var e,n,s,r,o,u=99;for(r=0;r<t._f.length;r++)e=a({},t),e._f=t._f[r],w(e),n=new i(e),o=c(e._a,n.toArray()),n._il&&(o+=n._il.length),u>o&&(u=o,s=n);a(t,s)}function v(t){var e,n=t._i,s=K.exec(n);if(s){for(t._f="YYYY-MM-DD"+(s[2]||" "),e=0;4>e;e++)if(te[e][1].exec(n)){t._f+=te[e][0];break}j.exec(n)&&(t._f+=" Z"),w(t)}else t._d=new Date(n)}function T(e){var n=e._i,s=G.exec(n);n===t?e._d=new Date:s?e._d=new Date(+s[1]):"string"==typeof n?v(e):d(n)?(e._a=n.slice(0),Y(e)):e._d=n instanceof Date?new Date(+n):new Date(n)}function b(t,e,n,s,i){return i.relativeTime(e||1,!!n,t,s)}function S(t,e,n){var s=W(Math.abs(t)/1e3),i=W(s/60),r=W(i/60),a=W(r/24),o=W(a/365),u=45>s&&["s",s]||1===i&&["m"]||45>i&&["mm",i]||1===r&&["h"]||22>r&&["hh",r]||1===a&&["d"]||25>=a&&["dd",a]||45>=a&&["M"]||345>a&&["MM",W(a/30)]||1===o&&["y"]||["yy",o];return u[2]=e,u[3]=t>0,u[4]=n,b.apply({},u)}function F(t,e,n){var s,i=n-e,r=n-t.day();return r>i&&(r-=7),i-7>r&&(r+=7),s=H(t).add("d",r),{week:Math.ceil(s.dayOfYear()/7),year:s.year()}}function O(t){var e=t._i,n=t._f;return null===e||""===e?null:("string"==typeof e&&(t._i=e=_().preparse(e)),H.isMoment(e)?(t=a({},e),t._d=new Date(+e._d)):n?d(n)?k(t):w(t):T(t),new i(t))}function z(t,e){H.fn[t]=H.fn[t+"s"]=function(t){var n=this._isUTC?"UTC":"";return null!=t?(this._d["set"+n+e](t),H.updateOffset(this),this):this._d["get"+n+e]()}}function C(t){H.duration.fn[t]=function(){return this._data[t]}}function L(t,e){H.duration.fn["as"+t]=function(){return+this/e}}for(var H,P,U="2.1.0",W=Math.round,x={},A="undefined"!=typeof module&&module.exports,G=/^\/?Date\((\-?\d+)/i,Z=/(\-)?(\d*)?\.?(\d+)\:(\d+)\:(\d+)\.?(\d{3})?/,E=/(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|SS?S?|X|zz?|ZZ?|.)/g,N=/(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,J=/\d\d?/,I=/\d{1,3}/,V=/\d{3}/,X=/\d{1,4}/,$=/[+\-]?\d{1,6}/,R=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,j=/Z|[\+\-]\d\d:?\d\d/i,q=/T/i,B=/[\+\-]?\d+(\.\d{1,3})?/,K=/^\s*\d{4}-\d\d-\d\d((T| )(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,Q="YYYY-MM-DDTHH:mm:ssZ",te=[["HH:mm:ss.S",/(T| )\d\d:\d\d:\d\d\.\d{1,3}/],["HH:mm:ss",/(T| )\d\d:\d\d:\d\d/],["HH:mm",/(T| )\d\d:\d\d/],["HH",/(T| )\d\d/]],ee=/([\+\-]|\d\d)/gi,ne="Date|Hours|Minutes|Seconds|Milliseconds".split("|"),se={Milliseconds:1,Seconds:1e3,Minutes:6e4,Hours:36e5,Days:864e5,Months:2592e6,Years:31536e6},ie={ms:"millisecond",s:"second",m:"minute",h:"hour",d:"day",w:"week",M:"month",y:"year"},re={},ae="DDD w W M D d".split(" "),oe="M D H h m s w W".split(" "),ue={M:function(){return this.month()+1},MMM:function(t){return this.lang().monthsShort(this,t)},MMMM:function(t){return this.lang().months(this,t)},D:function(){return this.date()},DDD:function(){return this.dayOfYear()},d:function(){return this.day()},dd:function(t){return this.lang().weekdaysMin(this,t)},ddd:function(t){return this.lang().weekdaysShort(this,t)},dddd:function(t){return this.lang().weekdays(this,t)},w:function(){return this.week()},W:function(){return this.isoWeek()},YY:function(){return u(this.year()%100,2)},YYYY:function(){return u(this.year(),4)},YYYYY:function(){return u(this.year(),5)},gg:function(){return u(this.weekYear()%100,2)},gggg:function(){return this.weekYear()},ggggg:function(){return u(this.weekYear(),5)},GG:function(){return u(this.isoWeekYear()%100,2)},GGGG:function(){return this.isoWeekYear()},GGGGG:function(){return u(this.isoWeekYear(),5)},e:function(){return this.weekday()},E:function(){return this.isoWeekday()},a:function(){return this.lang().meridiem(this.hours(),this.minutes(),!0)},A:function(){return this.lang().meridiem(this.hours(),this.minutes(),!1)},H:function(){return this.hours()},h:function(){return this.hours()%12||12},m:function(){return this.minutes()},s:function(){return this.seconds()},S:function(){return~~(this.milliseconds()/100)},SS:function(){return u(~~(this.milliseconds()/10),2)},SSS:function(){return u(this.milliseconds(),3)},Z:function(){var t=-this.zone(),e="+";return 0>t&&(t=-t,e="-"),e+u(~~(t/60),2)+":"+u(~~t%60,2)},ZZ:function(){var t=-this.zone(),e="+";return 0>t&&(t=-t,e="-"),e+u(~~(10*t/6),4)},z:function(){return this.zoneAbbr()},zz:function(){return this.zoneName()},X:function(){return this.unix()}};ae.length;)P=ae.pop(),ue[P+"o"]=n(ue[P],P);for(;oe.length;)P=oe.pop(),ue[P+P]=e(ue[P],2);for(ue.DDDD=e(ue.DDD,3),s.prototype={set:function(t){var e,n;for(n in t)e=t[n],"function"==typeof e?this[n]=e:this["_"+n]=e},_months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),months:function(t){return this._months[t.month()]},_monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),monthsShort:function(t){return this._monthsShort[t.month()]},monthsParse:function(t){var e,n,s;for(this._monthsParse||(this._monthsParse=[]),e=0;12>e;e++)if(this._monthsParse[e]||(n=H([2e3,e]),s="^"+this.months(n,"")+"|^"+this.monthsShort(n,""),this._monthsParse[e]=new RegExp(s.replace(".",""),"i")),this._monthsParse[e].test(t))return e},_weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdays:function(t){return this._weekdays[t.day()]},_weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysShort:function(t){return this._weekdaysShort[t.day()]},_weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),weekdaysMin:function(t){return this._weekdaysMin[t.day()]},weekdaysParse:function(t){var e,n,s;for(this._weekdaysParse||(this._weekdaysParse=[]),e=0;7>e;e++)if(this._weekdaysParse[e]||(n=H([2e3,1]).day(e),s="^"+this.weekdays(n,"")+"|^"+this.weekdaysShort(n,"")+"|^"+this.weekdaysMin(n,""),this._weekdaysParse[e]=new RegExp(s.replace(".",""),"i")),this._weekdaysParse[e].test(t))return e},_longDateFormat:{LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D YYYY",LLL:"MMMM D YYYY LT",LLLL:"dddd, MMMM D YYYY LT"},longDateFormat:function(t){var e=this._longDateFormat[t];return!e&&this._longDateFormat[t.toUpperCase()]&&(e=this._longDateFormat[t.toUpperCase()].replace(/MMMM|MM|DD|dddd/g,function(t){return t.slice(1)}),this._longDateFormat[t]=e),e},isPM:function(t){return"p"===(t+"").toLowerCase()[0]},_meridiemParse:/[ap]\.?m?\.?/i,meridiem:function(t,e,n){return t>11?n?"pm":"PM":n?"am":"AM"},_calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},calendar:function(t,e){var n=this._calendar[t];return"function"==typeof n?n.apply(e):n},_relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},relativeTime:function(t,e,n,s){var i=this._relativeTime[n];return"function"==typeof i?i(t,e,n,s):i.replace(/%d/i,t)},pastFuture:function(t,e){var n=this._relativeTime[t>0?"future":"past"];return"function"==typeof n?n(e):n.replace(/%s/i,e)},ordinal:function(t){return this._ordinal.replace("%d",t)},_ordinal:"%d",preparse:function(t){return t},postformat:function(t){return t},week:function(t){return F(t,this._week.dow,this._week.doy).week},_week:{dow:0,doy:6}},H=function(t,e,n){return O({_i:t,_f:e,_l:n,_isUTC:!1})},H.utc=function(t,e,n){return O({_useUTC:!0,_isUTC:!0,_l:n,_i:t,_f:e})},H.unix=function(t){return H(1e3*t)},H.duration=function(t,e){var n,s,i=H.isDuration(t),a="number"==typeof t,o=i?t._input:a?{}:t,u=Z.exec(t);return a?e?o[e]=t:o.milliseconds=t:u&&(n="-"===u[1]?-1:1,o={y:0,d:~~u[2]*n,h:~~u[3]*n,m:~~u[4]*n,s:~~u[5]*n,ms:~~u[6]*n}),s=new r(o),i&&t.hasOwnProperty("_lang")&&(s._lang=t._lang),s},H.version=U,H.defaultFormat=Q,H.updateOffset=function(){},H.lang=function(t,e){return t?(e?l(t,e):x[t]||_(t),H.duration.fn._lang=H.fn._lang=_(t),void 0):H.fn._lang._abbr},H.langData=function(t){return t&&t._lang&&t._lang._abbr&&(t=t._lang._abbr),_(t)},H.isMoment=function(t){return t instanceof i},H.isDuration=function(t){return t instanceof r},H.fn=i.prototype={clone:function(){return H(this)},valueOf:function(){return+this._d+6e4*(this._offset||0)},unix:function(){return Math.floor(+this/1e3)},toString:function(){return this.format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},toDate:function(){return this._offset?new Date(+this):this._d},toISOString:function(){return M(H(this).utc(),"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")},toArray:function(){var t=this;return[t.year(),t.month(),t.date(),t.hours(),t.minutes(),t.seconds(),t.milliseconds()]},isValid:function(){return null==this._isValid&&(this._isValid=this._a?!c(this._a,(this._isUTC?H.utc(this._a):H(this._a)).toArray()):!isNaN(this._d.getTime())),!!this._isValid},utc:function(){return this.zone(0)},local:function(){return this.zone(0),this._isUTC=!1,this},format:function(t){var e=M(this,t||H.defaultFormat);return this.lang().postformat(e)},add:function(t,e){var n;return n="string"==typeof t?H.duration(+e,t):H.duration(t,e),h(this,n,1),this},subtract:function(t,e){var n;return n="string"==typeof t?H.duration(+e,t):H.duration(t,e),h(this,n,-1),this},diff:function(t,e,n){var s,i,r=this._isUTC?H(t).zone(this._offset||0):H(t).local(),a=6e4*(this.zone()-r.zone());return e=f(e),"year"===e||"month"===e?(s=432e5*(this.daysInMonth()+r.daysInMonth()),i=12*(this.year()-r.year())+(this.month()-r.month()),i+=(this-H(this).startOf("month")-(r-H(r).startOf("month")))/s,i-=6e4*(this.zone()-H(this).startOf("month").zone()-(r.zone()-H(r).startOf("month").zone()))/s,"year"===e&&(i/=12)):(s=this-r,i="second"===e?s/1e3:"minute"===e?s/6e4:"hour"===e?s/36e5:"day"===e?(s-a)/864e5:"week"===e?(s-a)/6048e5:s),n?i:o(i)},from:function(t,e){return H.duration(this.diff(t)).lang(this.lang()._abbr).humanize(!e)},fromNow:function(t){return this.from(H(),t)},calendar:function(){var t=this.diff(H().startOf("day"),"days",!0),e=-6>t?"sameElse":-1>t?"lastWeek":0>t?"lastDay":1>t?"sameDay":2>t?"nextDay":7>t?"nextWeek":"sameElse";return this.format(this.lang().calendar(e,this))},isLeapYear:function(){var t=this.year();return 0===t%4&&0!==t%100||0===t%400},isDST:function(){return this.zone()<this.clone().month(0).zone()||this.zone()<this.clone().month(5).zone()},day:function(t){var e=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=t?"string"==typeof t&&(t=this.lang().weekdaysParse(t),"number"!=typeof t)?this:this.add({d:t-e}):e},month:function(t){var e,n=this._isUTC?"UTC":"";return null!=t?"string"==typeof t&&(t=this.lang().monthsParse(t),"number"!=typeof t)?this:(e=this.date(),this.date(1),this._d["set"+n+"Month"](t),this.date(Math.min(e,this.daysInMonth())),H.updateOffset(this),this):this._d["get"+n+"Month"]()},startOf:function(t){switch(t=f(t)){case"year":this.month(0);case"month":this.date(1);case"week":case"day":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===t&&this.weekday(0),this},endOf:function(t){return this.startOf(t).add(t,1).subtract("ms",1)},isAfter:function(t,e){return e="undefined"!=typeof e?e:"millisecond",+this.clone().startOf(e)>+H(t).startOf(e)},isBefore:function(t,e){return e="undefined"!=typeof e?e:"millisecond",+this.clone().startOf(e)<+H(t).startOf(e)},isSame:function(t,e){return e="undefined"!=typeof e?e:"millisecond",+this.clone().startOf(e)===+H(t).startOf(e)},min:function(t){return t=H.apply(null,arguments),this>t?this:t},max:function(t){return t=H.apply(null,arguments),t>this?this:t},zone:function(t){var e=this._offset||0;return null==t?this._isUTC?e:this._d.getTimezoneOffset():("string"==typeof t&&(t=p(t)),Math.abs(t)<16&&(t=60*t),this._offset=t,this._isUTC=!0,e!==t&&h(this,H.duration(e-t,"m"),1,!0),this)},zoneAbbr:function(){return this._isUTC?"UTC":""},zoneName:function(){return this._isUTC?"Coordinated Universal Time":""},daysInMonth:function(){return H.utc([this.year(),this.month()+1,0]).date()},dayOfYear:function(t){var e=W((H(this).startOf("day")-H(this).startOf("year"))/864e5)+1;return null==t?e:this.add("d",t-e)},weekYear:function(t){var e=F(this,this.lang()._week.dow,this.lang()._week.doy).year;return null==t?e:this.add("y",t-e)},isoWeekYear:function(t){var e=F(this,1,4).year;return null==t?e:this.add("y",t-e)},week:function(t){var e=this.lang().week(this);return null==t?e:this.add("d",7*(t-e))},isoWeek:function(t){var e=F(this,1,4).week;return null==t?e:this.add("d",7*(t-e))},weekday:function(t){var e=(this._d.getDay()+7-this.lang()._week.dow)%7;return null==t?e:this.add("d",t-e)},isoWeekday:function(t){return null==t?this.day()||7:this.day(this.day()%7?t:t-7)},lang:function(e){return e===t?this._lang:(this._lang=_(e),this)}},P=0;P<ne.length;P++)z(ne[P].toLowerCase().replace(/s$/,""),ne[P]);z("year","FullYear"),H.fn.days=H.fn.day,H.fn.months=H.fn.month,H.fn.weeks=H.fn.week,H.fn.isoWeeks=H.fn.isoWeek,H.fn.toJSON=H.fn.toISOString,H.duration.fn=r.prototype={_bubble:function(){var t,e,n,s,i=this._milliseconds,r=this._days,a=this._months,u=this._data;u.milliseconds=i%1e3,t=o(i/1e3),u.seconds=t%60,e=o(t/60),u.minutes=e%60,n=o(e/60),u.hours=n%24,r+=o(n/24),u.days=r%30,a+=o(r/30),u.months=a%12,s=o(a/12),u.years=s},weeks:function(){return o(this.days()/7)},valueOf:function(){return this._milliseconds+864e5*this._days+2592e6*(this._months%12)+31536e6*~~(this._months/12)},humanize:function(t){var e=+this,n=S(e,!t,this.lang());return t&&(n=this.lang().pastFuture(e,n)),this.lang().postformat(n)},add:function(t,e){var n=H.duration(t,e);return this._milliseconds+=n._milliseconds,this._days+=n._days,this._months+=n._months,this._bubble(),this},subtract:function(t,e){var n=H.duration(t,e);return this._milliseconds-=n._milliseconds,this._days-=n._days,this._months-=n._months,this._bubble(),this},get:function(t){return t=f(t),this[t.toLowerCase()+"s"]()},as:function(t){return t=f(t),this["as"+t.charAt(0).toUpperCase()+t.slice(1)+"s"]()},lang:H.fn.lang};for(P in se)se.hasOwnProperty(P)&&(L(P,se[P]),C(P.toLowerCase()));L("Weeks",6048e5),H.duration.fn.asMonths=function(){return(+this-31536e6*this.years())/2592e6+12*this.years()},H.lang("en",{ordinal:function(t){var e=t%10,n=1===~~(t%100/10)?"th":1===e?"st":2===e?"nd":3===e?"rd":"th";return t+n}}),A&&(module.exports=H),"undefined"==typeof ender&&(this.moment=H),"function"==typeof define&&define.amd&&define("moment",[],function(){return H})}.call(this);// moment.js language configuration
// language : french (fr)
// author : John Fischer : https://github.com/jfroffice
!function(){function e(e){e.lang("fr",{months:"janvier_f\xe9vrier_mars_avril_mai_juin_juillet_ao\xfbt_septembre_octobre_novembre_d\xe9cembre".split("_"),monthsShort:"janv._f\xe9vr._mars_avr._mai_juin_juil._ao\xfbt_sept._oct._nov._d\xe9c.".split("_"),weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY LT",LLLL:"dddd D MMMM YYYY LT"},calendar:{sameDay:"[Aujourd'hui \xe0] LT",nextDay:"[Demain \xe0] LT",nextWeek:"dddd [\xe0] LT",lastDay:"[Hier \xe0] LT",lastWeek:"dddd [dernier \xe0] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},ordinal:function(e){return e+(1===e?"er":"")},week:{dow:1,doy:4}})}"function"==typeof define&&define.amd&&define(["moment"],e),"undefined"!=typeof window&&window.moment&&e(window.moment)}();// moment.js language configuration
// language : japanese (ja)
// author : LI Long : https://github.com/baryon
!function(){function e(e){e.lang("ja",{months:"1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708".split("_"),monthsShort:"1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708".split("_"),weekdays:"\u65e5\u66dc\u65e5_\u6708\u66dc\u65e5_\u706b\u66dc\u65e5_\u6c34\u66dc\u65e5_\u6728\u66dc\u65e5_\u91d1\u66dc\u65e5_\u571f\u66dc\u65e5".split("_"),weekdaysShort:"\u65e5_\u6708_\u706b_\u6c34_\u6728_\u91d1_\u571f".split("_"),weekdaysMin:"\u65e5_\u6708_\u706b_\u6c34_\u6728_\u91d1_\u571f".split("_"),longDateFormat:{LT:"Ah\u6642m\u5206",L:"YYYY/MM/DD",LL:"YYYY\u5e74M\u6708D\u65e5",LLL:"YYYY\u5e74M\u6708D\u65e5LT",LLLL:"YYYY\u5e74M\u6708D\u65e5LT dddd"},meridiem:function(e){return 12>e?"\u5348\u524d":"\u5348\u5f8c"},calendar:{sameDay:"[\u4eca\u65e5] LT",nextDay:"[\u660e\u65e5] LT",nextWeek:"[\u6765\u9031]dddd LT",lastDay:"[\u6628\u65e5] LT",lastWeek:"[\u524d\u9031]dddd LT",sameElse:"L"},relativeTime:{future:"%s\u5f8c",past:"%s\u524d",s:"\u6570\u79d2",m:"1\u5206",mm:"%d\u5206",h:"1\u6642\u9593",hh:"%d\u6642\u9593",d:"1\u65e5",dd:"%d\u65e5",M:"1\u30f6\u6708",MM:"%d\u30f6\u6708",y:"1\u5e74",yy:"%d\u5e74"}})}"function"==typeof define&&define.amd&&define(["moment"],e),"undefined"!=typeof window&&window.moment&&e(window.moment)}();// moment.js language configuration
// language : portuguese (pt)
// author : Jefferson : https://github.com/jalex79
!function(){function e(e){e.lang("pt",{months:"Janeiro_Fevereiro_Mar\xe7o_Abril_Maio_Junho_Julho_Agosto_Setembro_Outubro_Novembro_Dezembro".split("_"),monthsShort:"Jan_Fev_Mar_Abr_Mai_Jun_Jul_Ago_Set_Out_Nov_Dez".split("_"),weekdays:"Domingo_Segunda-feira_Ter\xe7a-feira_Quarta-feira_Quinta-feira_Sexta-feira_S\xe1bado".split("_"),weekdaysShort:"Dom_Seg_Ter_Qua_Qui_Sex_S\xe1b".split("_"),weekdaysMin:"Dom_2\xaa_3\xaa_4\xaa_5\xaa_6\xaa_S\xe1b".split("_"),longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY LT",LLLL:"dddd, D [de] MMMM [de] YYYY LT"},calendar:{sameDay:"[Hoje \xe0s] LT",nextDay:"[Amanh\xe3 \xe0s] LT",nextWeek:"dddd [\xe0s] LT",lastDay:"[Ontem \xe0s] LT",lastWeek:function(){return 0===this.day()||6===this.day()?"[\xdaltimo] dddd [\xe0s] LT":"[\xdaltima] dddd [\xe0s] LT"},sameElse:"L"},relativeTime:{future:"em %s",past:"%s atr\xe1s",s:"segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um m\xeas",MM:"%d meses",y:"um ano",yy:"%d anos"},ordinal:"%d\xba",week:{dow:1,doy:4}})}"function"==typeof define&&define.amd&&define(["moment"],e),"undefined"!=typeof window&&window.moment&&e(window.moment)}();// moment.js language configuration
// language : chinese
// author : suupic : https://github.com/suupic
!function(){function e(e){e.lang("zh",{months:"\u4e00\u6708_\u4e8c\u6708_\u4e09\u6708_\u56db\u6708_\u4e94\u6708_\u516d\u6708_\u4e03\u6708_\u516b\u6708_\u4e5d\u6708_\u5341\u6708_\u5341\u4e00\u6708_\u5341\u4e8c\u6708".split("_"),monthsShort:"1\u6708_2\u6708_3\u6708_4\u6708_5\u6708_6\u6708_7\u6708_8\u6708_9\u6708_10\u6708_11\u6708_12\u6708".split("_"),weekdays:"\u661f\u671f\u65e5_\u661f\u671f\u4e00_\u661f\u671f\u4e8c_\u661f\u671f\u4e09_\u661f\u671f\u56db_\u661f\u671f\u4e94_\u661f\u671f\u516d".split("_"),weekdaysShort:"\u5468\u65e5_\u5468\u4e00_\u5468\u4e8c_\u5468\u4e09_\u5468\u56db_\u5468\u4e94_\u5468\u516d".split("_"),weekdaysMin:"\u65e5_\u4e00_\u4e8c_\u4e09_\u56db_\u4e94_\u516d".split("_"),longDateFormat:{LT:"Ah\u70b9mm",L:"YYYY\u5e74MMMD\u65e5",LL:"YYYY\u5e74MMMD\u65e5",LLL:"YYYY\u5e74MMMD\u65e5LT",LLLL:"YYYY\u5e74MMMD\u65e5ddddLT",l:"YYYY\u5e74MMMD\u65e5",ll:"YYYY\u5e74MMMD\u65e5",lll:"YYYY\u5e74MMMD\u65e5LT",llll:"YYYY\u5e74MMMD\u65e5ddddLT"},meridiem:function(e,n){return 9>e?"\u65e9\u4e0a":11>e&&30>n?"\u4e0a\u5348":13>e&&30>n?"\u4e2d\u5348":18>e?"\u4e0b\u5348":"\u665a\u4e0a"},calendar:{sameDay:"[\u4eca\u5929]LT",nextDay:"[\u660e\u5929]LT",nextWeek:"[\u4e0b]ddddLT",lastDay:"[\u6628\u5929]LT",lastWeek:"[\u4e0a]ddddLT",sameElse:"L"},ordinal:function(e,n){switch(n){case"d":case"D":case"DDD":return e+"\u65e5";case"M":return e+"\u6708";case"w":case"W":return e+"\u5468";default:return e}},relativeTime:{future:"%s\u5185",past:"%s\u524d",s:"\u51e0\u79d2",m:"1\u5206\u949f",mm:"%d\u5206\u949f",h:"1\u5c0f\u65f6",hh:"%d\u5c0f\u65f6",d:"1\u5929",dd:"%d\u5929",M:"1\u4e2a\u6708",MM:"%d\u4e2a\u6708",y:"1\u5e74",yy:"%d\u5e74"}})}"function"==typeof define&&define.amd&&define(["moment"],e),"undefined"!=typeof window&&window.moment&&e(window.moment)}();