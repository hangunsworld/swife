function Swife(target, options){
	if(target == null){
		console.log(new Error("Swife: 'target' is NULL."));
		return;
	}
	if(target.jquery == undefined){
		console.log(new Error("Swife: 'target' MUST be a jQuery object."));
		return;
	}
	if(target.length == 0){
		console.log(new Error("Swife: 'target' is NOT defined."));
		return;
	}
	
	var TARGET		= target;
	var CHILDREN	= TARGET.children();
	var LENGTH		= CHILDREN.length;
	var DUMMY		= $('<div style="position:absolute;top:0;left:0;"></div>');
	var DOCUMENT	= $(document);
	var TOUCH_OBJ	= {startx:0, starty:0, lastx:0, lasty:0};
	var DIRECTION	= [];
	var IS_IE		= navigator.userAgent.indexOf("MSIE") >= 0;
	var tolerance	= 20;
	var swifeState	= "";
	var swipeIndex	= 0;
	var animating	= false;
	var looping		= true;
	var forceTouchEndID, TOUCH_END;
	var startCallback, finishCallback;
	
	if(options != undefined){
		if(options.looping != undefined && typeof(options.looping) == "boolean"){
			looping = options.looping;
		}
	}
	if(! IS_IE){
		TARGET.bind("touchstart", touchStart);
		TARGET.bind("mousedown", mouseDown);
	}
	setChildrenVisPos();
	
	if(options != undefined){
		if(options.start != undefined && typeof(options.start) == "function"){
			startCallback = options.start;
		}
		if(options.finish != undefined && typeof(options.finish) == "function"){
			finishCallback = options.finish;
		}
	}
	
	
	
	try{
		TOUCH_END = new MouseEvent("touchend");
	}catch(e){
		TOUCH_END = {type:"touchend"};
	}
	
	// MOUSE_DOWN event listener
	function mouseDown(e){
		if(swipeStart(e) == false){ return false; }
	}
	// MOUSE_MOVE event listener
	function mouseMove(e){
		swipeMove(e);
	}
	// MOUSE_UP event listener
	function mouseUp(e){
		swipeEnd(e);
	}
	
	// TOUCH_START event listener
	function touchStart(e){
		if(swipeStart(e) == false){ return false; }
	}
	// TOUCH_MOVE event listener
	function touchMove(e){
		swipeMove(e);
	}
	// TOUCH_END event listener
	function touchEnd(e){
		swipeEnd(e);
	}
	
	// swipe start
	function swipeStart(e){
		if(animating){ return false; }
		
		swifeState = "start";
		var isTouch = false;
		if(e.type == "touchstart"){
			isTouch = true;
		}
		
		var startx, starty;
		if(isTouch){
			startx = e.originalEvent.touches[0].clientX;
			starty = e.originalEvent.touches[0].clientY;
		}else{
			e.preventDefault();// prevent selection
			startx = e.pageX;
			starty = e.pageY;
		}
		
		TOUCH_OBJ.startx = startx;
		TOUCH_OBJ.starty = starty;
		TOUCH_OBJ.lastx = startx;
		TOUCH_OBJ.lasty = starty;
		DIRECTION.length = 0;
		
		if(isTouch){
			DOCUMENT.unbind("touchmove", touchMove);
			DOCUMENT.unbind("touchend", touchEnd);
			DOCUMENT.bind("touchmove", touchMove);
			DOCUMENT.bind("touchend",touchEnd);
		}else{
			DOCUMENT.unbind("mousemove", mouseMove);
			DOCUMENT.unbind("mouseup", mouseUp);
			DOCUMENT.bind("mousemove", mouseMove);
			DOCUMENT.bind("mouseup",mouseUp);
		}
	}
	
	// swipe move
	function swipeMove(e){
		var isTouch = false;
		if(e.type == "touchmove"){
			isTouch = true;
		}
		
		var currentx, currenty;
		if(isTouch){
			currentx = e.originalEvent.touches[0].clientX;
			currenty = e.originalEvent.touches[0].clientY;
		}else{
			currentx = e.pageX;
			currenty = e.pageY;
		}
		
		var difx = currentx - TOUCH_OBJ.startx;
		var dify = currenty - TOUCH_OBJ.starty;
		
		if(swifeState == "start"){
			if(isTouch){
				var rat = Math.abs(difx / dify);
				if(rat < 1){
					// vertical scroll, prevent swipe
					swipeEnd(null);
					return;
				}
			}
			
			if(startCallback != undefined){
				startCallback();
			}
		}
		
		swifeState = "move";
		e.preventDefault();
		
		var delta = currentx - TOUCH_OBJ.lastx;
		if(delta > 0){
			DIRECTION.unshift(1);
		}else if(delta < 0){
			DIRECTION.unshift(-1);
		}else{
			DIRECTION.unshift(0);
		}
		if(DIRECTION.length > 5){
			DIRECTION.length = 5;
		}
		
		var tw = TARGET.width();
		var pct = difx / tw * 100;
		TARGET.css("transform", "translate(" + pct + "%, 0)");
		DUMMY.css("left", pct);
		
		TOUCH_OBJ.lastx = currentx;
		TOUCH_OBJ.lasty = currenty;
		
		if(isTouch){
			forceTouchEnd(true);
		}else{
			TARGET.css("pointer-events", "none");
		}
	}
	
	// swipe end
	function swipeEnd(e){
		var isTouch = false;
		if(e == null){
			isTouch = true;
		}else if(e.type == "touchend"){
			isTouch = true;
		}
		
		if(isTouch){
			DOCUMENT.unbind("touchmove", touchMove);
			DOCUMENT.unbind("touchend", touchEnd);
			forceTouchEnd(false);
		}else{
			DOCUMENT.unbind("mousemove", mouseMove);
			DOCUMENT.unbind("mouseup", mouseUp);
			TARGET.css("pointer-events", "auto");
		}
		
		swifeState = "end";
		if(e != null){
			decideAnimation(true);
		}else{
			decideAnimation(false);
		}
	}
	
	// trigger TOUCH_END forcibly when there is no response in some time
	function forceTouchEnd(repeat){
		if(repeat != true){ repeat = false; }
		
		clearTimeout(forceTouchEndID);
		if(repeat){
			forceTouchEndID = setTimeout(forceTouchEndDelay, 300);
			TOUCH_OBJ.time = (new Date()).getTime();
		}
	}
	
	// trigger TOUCH_END
	function forceTouchEndDelay(){
		touchEnd(TOUCH_END);
	}
	
	// decide animation direction
	function decideAnimation(animation){
		var percent = parseInt(DUMMY.css("left"), 10);
		var direction = getDirection();
		animationStart(percent, direction, animation);
	}
	
	// start animation
	function animationStart(percent, direction, animation){
		if(animation != true){ animation = false; }
		var w = TARGET.width();
		if(w < 400){
			tolerance = 20;
		}else if(w < 800){
			tolerance = 10;
		}else{
			tolerance = 5;
		}
		
		var to = 0;
		if(percent * direction <= 0){
			//
		}else if(percent <= -tolerance){
			to = -100;
			swipeIndex++;
		}else if(percent >= tolerance){
			to = 100;
			swipeIndex--;
		}
		
		var duration = 150;
		if(to == 0){
			duration = 100;
		}
		
		DUMMY.stop(true);
		if(animation){
			animating = true;
			DUMMY.animate({left:to}, {"duration":duration, progress:animationProgress, complete:animationComplete});
		}else{
			animating = false;
			animationComplete();
		}
	}
	
	// animation progress callback
	function animationProgress(){
		TARGET.css("transform", "translate("+parseInt(DUMMY.css('left'), 10)+"%, 0)");
	}
	
	// animation complete callback
	function animationComplete(){
		DUMMY.css("left", 0);
		TARGET.css("transform", "translate(0, 0)");
		setChildrenVisPos();
		animating = false;
	}
	
	// determine direction
	function getDirection(){
		var len = DIRECTION.length;
		var direction = 0;
		for(var i=0; i<len; i++){
			direction += DIRECTION[i];
		}
		
		if(!looping){
			var len = LENGTH - 1;
			var swidx = constrainIndex(swipeIndex);
			if(swidx == 0 && direction > 0){
				direction = 0;
			}else if(swidx == len && direction < 0){
				direction = 0;
			}
		}
		
		return direction;
	}
	
	// set children's visibility and position
	function setChildrenVisPos(){
		var child, d1, d2;
		var len = LENGTH - 1;
		var swidx = constrainIndex(swipeIndex);
		
		CHILDREN.each(function(idx, itm){
			child = $(itm);
			d1 = swidx - idx;
			d2 = idx - swidx;
			
			child.css("display", "none");
			if(d1 == 0){
				child.css({display:"block", left:0});
			}
			if((d1 == 1) || (d2 == len)){
				child.css({display:"block", left:"-100%"});
				if(!looping && idx == len){
					child.css("display", "none");
				}
			}
			if((d2 == 1) || (d1 == len)){
				child.css({display:"block", left:"100%"});
				if(!looping && idx == 0){
					child.css("display", "none");
				}
			}
		});
		
		if(finishCallback != undefined){
			finishCallback();
		}
	}
	
	// start slide animation
	function setSlide(idx){
		idx = constrainIndex(idx);
		var cidx = getSwifeIndex();
		var d = "prev";
		if(idx > cidx){
			d = "next";
		}
		
		if(startCallback != undefined){
			startCallback();
		}
		
		var slide = CHILDREN.eq(idx);
		CHILDREN.css("display", "none");
		CHILDREN.eq(cidx).css("display", "block");
		slide.css("display", "block");
		if(d == "prev"){
			swipeIndex = idx + 1;
			slide.css("left", "-100%");
			animationStart(50, 1, true);
		}else{
			swipeIndex = idx -1;
			slide.css("left", "100%");
			animationStart(-50, -1, true);
		}
	}
	
	// get current index
	function getSwifeIndex(){
		return constrainIndex(swipeIndex);
	}
	
	// set current index
	function setSwifeIndex(idx){
		swipeIndex = constrainIndex(idx);
		setChildrenVisPos();
	}
	
	// make sure index is within range
	function constrainIndex(idx){
		idx = idx % LENGTH;
		if(idx < 0){
			idx = (idx + LENGTH) % LENGTH;
		}
		return idx;
	}
	
	// return
	return {
		next:function(){// slide to next
			if(animating){ return; }
			setSlide( getSwifeIndex() + 1 );
		},
		prev:function(){// slide to prev
			if(animating){ return; }
			setSlide( getSwifeIndex() - 1 );
		},
		getIndex:function(){// get current index
			return getSwifeIndex();
		},
		setIndex:function(index, animation){// slide to index
			var idx = parseInt(index, 10);
			if(isNaN(idx)){
				console.log(new Error("Swife: 'index' is NOT a number."));
				return;
			}
			
			if(animating){ return; }
			
			if(animation == true){
				setSlide(idx);
			}else{
				setSwifeIndex(idx);
			}
		},
		getLength:function(){// get number of children
			return LENGTH;
		}
	};
}