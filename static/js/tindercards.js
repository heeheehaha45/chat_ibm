/*jslint browser: true*/
/*global console, Hammer, $*/

/**
 * Tindercards.js
 *
 * @author www.timo-ernst.net
 * @module Tindercardsjs
 * License: MIT
 */
var Tindercardsjs = Tindercardsjs || {};

Tindercardsjs = (function () {
  'use strict';
  
  var exports = {};
  
  /**
   * Represents one card
   *
   * @memberof module:Tindercardsjs
   * @class
   */
  exports.card = function (format, cardid, name, faculty, desc, imgpath, addUrl) {
    
    var jqo;
    
    /**
     * Returns a jQuery representation of this card
     *
     * @method
     * @public
     * @return {object} A jQuery representation of this card
     */
    this.tojQuery = function () {
      if (!jqo) {
		if (format===1)
			jqo = $('<div class="tc-card">').attr('data-cardid', cardid).html('<div class="tc-card-img-cont"><img src="' + imgpath + '" class="tc-card-img" onerror="imgError(this)"><div class="tc-card-body"><h2 class="tc-card-name">' + name + '&ensp;</h2><h4 class="tc-card-faculty">' + faculty + '</h4><div class="tc-card-desc">' + desc + '</div></div><div class="tc-card-add"><a href="' + addUrl + '" class="btn btn-info" role="button" aria-pressed="true">Add Friend</a></div></div>');
		else if (format===2)
			jqo = $('<div class="tc-card">').attr('data-cardid', cardid).html('<div class="tc-card-img-cont"><img src="' + imgpath + '" class="tc-card-img" onerror="imgError(this)"><div class="tc-card-body"><h2 class="tc-card-name">' + name + '&ensp;</h2><h4 class="tc-card-faculty">' + faculty + '</h4><div class="tc-card-desc">' + desc + '</div></div></div>');
		else if (format===3)
			jqo = $('<div class="tc-card">').attr('data-cardid', cardid).html('<div class="tc-card-img-cont"><img src="' + imgpath + '" class="tc-card-img" onerror="imgError(this)"><div class="tc-card-body"><h2 class="tc-card-name">' + name + '&ensp;</h2><h4 class="tc-card-faculty">' + faculty + '</h4><div class="tc-card-desc">' + desc + '</div></div><div class="tc-card-add"><a href="#" class="btn btn-info btn" role="button" aria-pressed="true" onclick=\'$("#frmUpdateMyInfo").submit()\'>Edit Profile</a><a href="#" class="btn btn-info btn" role="button" aria-pressed="true" onclick=\'$("#frmUpdateMyAvatar").submit()\'>Change Pic</a><a href="#" class="btn btn-info btn" role="button" aria-pressed="true" onclick=\'$("#frmChangePwd").submit()\'>Change Pwd</a></div></div>');

      }
      return jqo;
    };

  };
  
  /**
   * Initializes swipe
   *
   * @private
   * @function
   */
  function initSwipe(onSwiped) {
    var $topcard = $('.tc-card'),
      deltaX = 0;

    $topcard.each(function () {

      var $card = $(this);

      (new Hammer(this)).on("panleft panright panend panup pandown", function (ev) {
        var transform,
          yfactor = ev.deltaX >= 0 ? -1 : 1,
          resultEvent = {};

        if (ev.type === 'panend') {
          if (deltaX > 100 || deltaX < -100) {
            transform = 'translate3d(' + (5 * deltaX) + 'px, ' + (yfactor * 1.5 * deltaX) + 'px, 0)';
            $card.css({
              'transition': '-webkit-transform 0.5s',
              '-webkit-transform': transform + ' rotate(' + ((-5 * deltaX) / 10) + 'deg)'
            });
            setTimeout(function () {
              $card.css({
                'display': 'none'
              });
              if (typeof onSwiped === 'function') {
                resultEvent.cardid = $card.attr('data-cardid');
                resultEvent.card = $card;
                if (deltaX > 100) {
                  resultEvent.direction = 'right';
                } else {
                  resultEvent.direction = 'left';
                }
                onSwiped(resultEvent);
              } else {
                console.warn('onSwipe callback does not exist!');
              }
            }, 500);
          } else {
            transform = 'translate3d(0px, 0, 0)';
            $card.css({
              'transition': '-webkit-transform 0.3s',
              '-webkit-transform': transform + ' rotate(0deg)'
            });
            setTimeout(function () {
              $card.css({
                'transition': '-webkit-transform 0s'
              });
            }, 300);
          }
        } else if (ev.type === 'panup' || ev.type === 'pandown') {
          // No vertical scroll
          ev.preventDefault();
        } else {
          deltaX = ev.deltaX;

          transform = 'translate3d(' + deltaX + 'px, ' + (yfactor * 0.15 * deltaX) + 'px, 0)';

          $card.css({
            '-webkit-transform': transform + ' rotate(' + ((-1 * deltaX) / 10) + 'deg)'
          });
        }


      });
    });
  }
  
  /**
   * Renders the given cards
   *
   * @param {array} cards The cards (must be instanceof Tindercardsjs.card)
   * @param {jQuery} $target The container in which the cards should be rendered into
   * @param {function} onSwiped Callback when a card was swiped
   * @example Tindercardsjs.render(cards, $('#main'));
   * @method
   * @public
   * @memberof module:Tindercardsjs
   */
  exports.render = function (cards, $target, isSwipe, onSwiped) {
    var i,
      $card;
    
    if (cards) {
      for (i = 0; i < cards.length; i = i + 1) {
        $card = cards[i].tojQuery().appendTo($target).css({
          'position': 'absolute',
          'border-radius': '10px',
          'background-color': '#fff',
          'height': '430px',
          'left': '10px',
          //'top': '10px',
          'right': '10px'
        });
        
        $card.find('.tc-card-img').css({
		  'width': '300px',
		  'height': '300px',
          'border-radius': '10px 10px 0 0',
		  'object-fit': 'cover',
		  '-webkit-user-drag': 'none',
		  '-khtml-user-drag': 'none',
		  '-moz-user-drag': 'none',
		  '-o-user-drag': 'none',
		  'user-drag': 'none'
        });
        
        $card.find('.tc-card-name').css({
          'margin-top': '0',
          'margin-bottom': '5px',
		  'display' : 'inline-block'
        });
		
		$card.find('.tc-card-faculty').css({
          'margin-top': '0',
          'margin-bottom': '5px',
		  'display' : 'inline-block'
        });
        
        $card.find('.tc-card-body').css({
          'position': 'relative',
          'left': '10px',
          'width': '280px'
        });
		
		$card.find('.tc-card-add').css({
		  'position': 'absolute',
		  'width': '300px',
		  'margin': '0px auto',
		  'text-align': 'center',
		  'bottom': '5px'
        });
		
      }
      
	  if (isSwipe=='true')
		initSwipe(onSwiped);
      
    } else {
      console.warn('card array empty, no cards will be displayed');
    }
  };
  
  return exports;
  
}());